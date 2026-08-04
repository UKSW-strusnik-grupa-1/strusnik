import unittest

from flask import Flask

from models import User, db
from routes.friends import friends
from utils import create_jwt_token


class FriendsApiTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY="test-secret",
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            TOKEN_MAX_AGE=3600,
        )
        db.init_app(self.app)
        self.app.register_blueprint(friends, url_prefix="/api/friends")
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        self.alice = User(username="Alice", password="hashed")
        self.bob = User(username="Bobby", password="hashed")
        db.session.add_all([self.alice, self.bob])
        db.session.commit()
        self.alice_headers = {"Authorization": f"Bearer {create_jwt_token(self.alice.id, self.alice.username)}"}
        self.bob_headers = {"Authorization": f"Bearer {create_jwt_token(self.bob.id, self.bob.username)}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_request_acceptance_creates_a_symmetric_friendship(self):
        client = self.app.test_client()
        search = client.get("/api/friends/search?q=bob", headers=self.alice_headers)
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.json["results"][0]["username"], "Bobby")

        created = client.post(
            "/api/friends/requests",
            headers=self.alice_headers,
            json={"recipient_id": self.bob.id},
        )
        self.assertEqual(created.status_code, 201)

        incoming = client.get("/api/friends", headers=self.bob_headers).json["incoming"]
        self.assertEqual(len(incoming), 1)
        accepted = client.post(
            f"/api/friends/requests/{incoming[0]['id']}/accept",
            headers=self.bob_headers,
        )
        self.assertEqual(accepted.status_code, 200)

        friends = client.get("/api/friends", headers=self.alice_headers).json["friends"]
        self.assertEqual([friend["username"] for friend in friends], ["Bobby"])

    def test_pending_request_can_be_cancelled_and_duplicates_are_blocked(self):
        client = self.app.test_client()
        created = client.post(
            "/api/friends/requests",
            headers=self.alice_headers,
            json={"recipient_id": self.bob.id},
        )
        self.assertEqual(created.status_code, 201)
        duplicate = client.post(
            "/api/friends/requests",
            headers=self.alice_headers,
            json={"recipient_id": self.bob.id},
        )
        self.assertEqual(duplicate.status_code, 409)

        request_id = client.get("/api/friends", headers=self.alice_headers).json["outgoing"][0]["id"]
        cancelled = client.post(
            f"/api/friends/requests/{request_id}/cancel",
            headers=self.alice_headers,
        )
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(client.get("/api/friends", headers=self.alice_headers).json["outgoing"], [])

    def test_rejected_request_cannot_be_sent_again_immediately(self):
        client = self.app.test_client()
        client.post(
            "/api/friends/requests",
            headers=self.alice_headers,
            json={"recipient_id": self.bob.id},
        )
        request_id = client.get("/api/friends", headers=self.bob_headers).json["incoming"][0]["id"]
        self.assertEqual(
            client.post(f"/api/friends/requests/{request_id}/reject", headers=self.bob_headers).status_code,
            200,
        )
        retry = client.post(
            "/api/friends/requests",
            headers=self.alice_headers,
            json={"recipient_id": self.bob.id},
        )
        self.assertEqual(retry.status_code, 429)

    def test_unauthorized_requests_are_rejected(self):
        response = self.app.test_client().get("/api/friends")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
