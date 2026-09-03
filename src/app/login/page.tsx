import LoginForm from "@/components/LoginForm";
import './login.css';

export default function LoginPage() {
  return (
    <div className="login-page-container">
      <div className="login-card">
        <h1 className="login-title">MediCabinet</h1>
        <LoginForm />
      </div>
    </div>
  );
}
