import LoginModal from "../components/login/modal";

export default function AuthPage() {
  return (
    <div className="w-full h-screen">
      <img 
        alt="test" 
        src="/main/background.png" 
        className="w-full h-full object-fill"
      />
      <LoginModal/>
    </div>
  )
}

