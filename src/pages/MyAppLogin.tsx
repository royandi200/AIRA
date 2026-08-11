import { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import type { Attendee } from './MyAppAuth';

/**
 * Login de /myapp con OTP real por SMS (WebSSenger) — garantiza que
 * quien usa la app es el dueño de la boleta (mismo número con el que
 * compró/se registró).
 */
export default function MyAppLogin({ onLogin }: { onLogin: (token: string, attendee: Attendee) => void }) {
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const sendCode = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/myapp-auth-enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (json.ok) {
        setInfo(json.message || 'Código enviado');
        setStep('otp');
      } else {
        setError(json.error || 'No se pudo enviar el código');
      }
    } catch {
      setError('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
    }
    setLoading(false);
  };

  const verify = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/myapp-auth-verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const json = await res.json();
      if (json.ok) onLogin(json.token, json.attendee);
      else setError(json.error || 'Código incorrecto');
    } catch {
      setError('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="myapp-login">
      <img src="/AIRA BLANCO.png" alt="AIRA" className="myapp-login-logo" />

      {step === 'phone' ? (
        <>
          <h2 className="myapp-login-title">Ingresa a tu AIRA</h2>
          <p className="myapp-login-sub">Usa el mismo número con el que compraste tu boleta</p>

          <div className="myapp-login-field">
            <Phone size={16} />
            <input
              inputMode="tel"
              placeholder="300 123 4567"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          {error && <p className="myapp-login-error">{error}</p>}

          <button
            className="myapp-login-btn"
            disabled={loading || phone.length < 7}
            onClick={sendCode}
          >
            {loading ? 'Enviando…' : 'Enviar código por SMS'}
          </button>
        </>
      ) : (
        <>
          <h2 className="myapp-login-title">Verifica tu número</h2>
          <p className="myapp-login-sub">{info || 'Te enviamos un código de 6 dígitos por SMS'}</p>

          <div className="myapp-login-field myapp-login-field--otp">
            <ShieldCheck size={16} />
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
          </div>

          {error && <p className="myapp-login-error">{error}</p>}

          <button
            className="myapp-login-btn"
            disabled={loading || otp.length < 6}
            onClick={verify}
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
          <button className="myapp-login-back" onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
            Cambiar número
          </button>
        </>
      )}
    </div>
  );
}
