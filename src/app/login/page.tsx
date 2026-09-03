import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '2.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#111827', fontSize: '1.75rem', fontWeight: 700 }}>Espace Connexion</h1>
        <LoginForm />
      </div>
    </div>
  );
}
