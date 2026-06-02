export default function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  signupForm,
  setLoginForm,
  setSignupForm,
  login,
  signup,
  updateForm,
  message,
  loading,
}) {
  return (
    <main className="auth-shell">
      <header>
        <p className="eyebrow">Swift Wheels</p>
        <h1>Bus Ticket Permission System</h1>
      </header>

      <nav className="app-nav" aria-label="Authentication">
        <button type="button" onClick={() => setAuthMode('login')}>Login</button>
        <button type="button" onClick={() => setAuthMode('signup')}>Customer Signup</button>
      </nav>

      {message && <p role="status" className="status-message">{message}</p>}

      {authMode === 'login' ? (
        <form className="form-grid" onSubmit={login}>
          <label>
            Email
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) => updateForm(setLoginForm, 'email', event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => updateForm(setLoginForm, 'password', event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>Login</button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={signup}>
          <label>
            Full Name
            <input
              value={signupForm.full_name}
              onChange={(event) => updateForm(setSignupForm, 'full_name', event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) => updateForm(setSignupForm, 'email', event.target.value)}
              required
            />
          </label>
          <label>
            Phone
            <input
              value={signupForm.phone}
              onChange={(event) => updateForm(setSignupForm, 'phone', event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={signupForm.password}
              onChange={(event) => updateForm(setSignupForm, 'password', event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>Create Customer Account</button>
        </form>
      )}
    </main>
  )
}

