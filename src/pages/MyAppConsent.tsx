import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { Attendee } from './MyAppAuth';

/**
 * Consentimiento informado — paso obligatorio una sola vez, justo
 * después del OTP y antes de entrar al menú. Adaptado del documento
 * legal de AIRA (asunción de riesgos, uso de imagen, tratamiento de
 * datos) al estilo visual de la app — mismo contenido, sin el
 * recuadro de firma a mano (checkbox + nombre real de la cuenta,
 * válido como aceptación electrónica, con fecha/hora/IP guardadas
 * en el servidor como evidencia).
 */

const ORG = 'AIRA Festival';
const CONTACTO = 'info@viveaira.live';

interface Clause { title: string; body: string[]; }

const CLAUSES: Clause[] = [
  { title: '1. Naturaleza del evento', body: [
    'AIRA es una experiencia recreativa y musical de tres (3) días y dos (2) noches en Guatapé y El Peñol (Antioquia), que puede incluir hospedaje en cabañas y suites, transporte terrestre en bus, presentaciones de música electrónica en distintos escenarios —incluidos escenarios al aire libre y junto al embalse (playa/lago)—, uso de piscina y zonas comunes, alimentación y actividades recreativas.',
  ]},
  { title: '2. Mayoría de edad y participación voluntaria', body: [
    'Declaro ser mayor de 18 años, tener plena capacidad legal y participar de forma libre, voluntaria y bajo mi propia decisión y responsabilidad.',
  ]},
  { title: '3. Estado de salud y aptitud', body: [
    'Declaro estar en condiciones físicas y de salud adecuadas para participar. Informé de manera veraz, en esta pantalla, cualquier condición médica, alergia o medicamento relevante. Es mi responsabilidad portar mis medicamentos.',
    `Autorizo al Organizador para que, ante una emergencia, gestione mi atención o traslado médico. Entiendo que los costos de dicha atención corren por mi cuenta.`,
  ]},
  { title: '4. Asunción de riesgos', body: [
    'Reconozco que asistir a un evento de estas características conlleva riesgos inherentes que no pueden eliminarse por completo, y los asumo de forma consciente y voluntaria: actividades cerca del agua (embalse, playa y piscina); transporte terrestre y desplazamientos por carretera; terreno natural irregular, pendientes y superficies resbaladizas; condiciones climáticas y exposición solar; altos niveles de sonido y efectos propios de un evento musical; aglomeraciones y esfuerzo físico; los efectos de mi consumo voluntario de alimentos o bebidas alcohólicas; y hechos ocasionados por terceros ajenos al control del Organizador.',
    'Participo aceptando estos riesgos por mi cuenta y riesgo, y me hago responsable de mi propia seguridad, integridad y bienes durante todo el evento, incluidos los trayectos de ida y regreso.',
  ]},
  { title: '5. Alcohol y sustancias', body: [
    'Si consumo bebidas alcohólicas lo hago de forma responsable y asumo la total responsabilidad por mi estado y mis actos. Está absolutamente prohibido el porte o consumo de sustancias ilícitas. El Organizador podrá retirar del evento, sin derecho a reembolso, a quien incumpla esta norma.',
  ]},
  { title: '6. Exoneración de responsabilidad', body: [
    `En la medida permitida por la ley, exonero y mantengo libre de responsabilidad a ${ORG}, su equipo, colaboradores, aliados, patrocinadores, proveedores, artistas y a los propietarios/administradores de los predios y alojamientos, respecto de lesión, daño, pérdida o gasto derivado de los riesgos que he asumido, de mis propios actos o de hechos de terceros — sin perjuicio de lo que la ley no permite renunciar (dolo o culpa grave del Organizador).`,
  ]},
  { title: '7. Responsabilidad por daños', body: [
    'Me hago responsable de los daños que llegue a causar a instalaciones, cabañas, mobiliario, equipos, al entorno natural o a otras personas. Autorizo al Organizador a cobrarme el valor de dichos daños.',
  ]},
  { title: '8. Objetos personales', body: [
    `Soy el único responsable del cuidado de mis objetos personales. ${ORG} no responde por pérdida, hurto o daño de bienes personales durante el evento, el transporte o el hospedaje.`,
  ]},
  { title: '9. Transporte (bus)', body: [
    'Si uso el transporte, me comprometo a llegar puntualmente al punto y hora de salida; el bus partirá a la hora indicada y la no presentación no genera reembolso ni reprogramación. El Organizador no responde por retrasos por tráfico, clima, orden público o fuerza mayor.',
  ]},
  { title: '10. Hospedaje y convivencia', body: [
    'Me comprometo a cuidar el alojamiento asignado y respetar a los demás huéspedes. No se tolerarán violencia, acoso, discriminación ni conductas que afecten la sana convivencia — el incumplimiento faculta al Organizador para retirarme del evento sin reembolso.',
  ]},
  { title: '11. Instrucciones y seguridad', body: [
    'Me obligo a seguir las indicaciones del staff, la seguridad y las autoridades, y a no ingresar a áreas restringidas.',
  ]},
  { title: '12. Autorización de uso de imagen', body: [
    `Autorizo libre, expresa, voluntaria, gratuita e indefinidamente a ${ORG} para captar, grabar, reproducir, editar y utilizar mi imagen, voz y semejanza —fotografías, videos, audios y transmisiones en vivo— tomadas antes, durante y después del evento.`,
    'Esta autorización es para fines de memoria, comunicación, promoción, publicidad y difusión del evento AIRA y sus próximas ediciones, en cualquier medio o plataforma, sin límite de territorio ni de tiempo y sin contraprestación a mi favor.',
    `Puedo solicitar no ser incluido en futuras publicaciones escribiendo a ${CONTACTO}, sin que afecte el material ya divulgado.`,
  ]},
  { title: '13. Tratamiento de datos personales', body: [
    'Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015, para: registro, control de acceso (incluido el código QR), logística y operación del evento, seguridad, atención de emergencias, y comunicaciones del evento y próximas ediciones.',
    'Entiendo que mi información de salud y mi imagen son datos sensibles, de entrega facultativa, que autorizo voluntariamente para poder atender emergencias.',
    `Puedo conocer, actualizar, rectificar, suprimir mis datos o revocar esta autorización escribiendo a ${CONTACTO}.`,
  ]},
  { title: '14. Pagos, cancelaciones y reembolsos', body: [
    'Los valores pagados no son reembolsables. Mi inasistencia, retiro anticipado o cambio de planes no genera devolución. La cesión de mi cupo solo procede con autorización previa del Organizador.',
  ]},
  { title: '15. Fuerza mayor y cambios del programa', body: [
    'Por causas de fuerza mayor (clima, orden público, salud pública, entre otras), el Organizador podrá ajustar, reprogramar o modificar el itinerario, horarios, artistas o actividades. Estos ajustes no dan lugar a reembolso.',
  ]},
  { title: '16. Disposiciones finales', body: [
    'Este documento se rige por las leyes de la República de Colombia. Declaro que leí y comprendí la totalidad de su contenido antes de aceptarlo.',
  ]},
];

const DECLS = [
  'Declaro que leí y entendí la totalidad de este documento y lo acepto libremente.',
  'Soy mayor de 18 años y participo de forma voluntaria.',
  'Asumo los riesgos descritos (cláusula 4) y me hago responsable de mi seguridad, integridad y bienes.',
  'La información que entrego, incluida la de salud, es veraz.',
  'Autorizo el uso de mi imagen (fotografía y video) conforme a la cláusula 12.',
  'Autorizo el tratamiento de mis datos personales conforme a la cláusula 13.',
];

export default function MyAppConsent({ attendee, token, onAccepted }: {
  attendee: Attendee; token: string; onAccepted: (consentAcceptedAt: string) => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => DECLS.map(() => false));
  const [openClause, setOpenClause] = useState<number | null>(null);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [medical, setMedical] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) => setChecked(prev => prev.map((v, idx) => (idx === i ? !v : v)));

  const submit = async () => {
    if (!allChecked || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/myapp-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          contactoEmergenciaNombre: emergencyName.trim() || null,
          contactoEmergenciaTelefono: emergencyPhone.trim() || null,
          condicionesMedicas: medical.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) onAccepted(json.consentAcceptedAt || new Date().toISOString());
      else setError(json.error || 'No se pudo registrar tu aceptación');
    } catch {
      setError('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
    }
    setSaving(false);
  };

  return (
    <div className="myapp-consent">
      <div className="myapp-consent-head">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="myapp-consent-logo" />
        <h2 className="myapp-consent-title">Consentimiento informado</h2>
        <p className="myapp-consent-sub">
          Hola {attendee.name.split(' ')[0]} — antes de entrar, lee y acepta las condiciones de participación en AIRA. Solo se hace una vez.
        </p>
      </div>

      <div className="myapp-consent-body">
        {CLAUSES.map((c, i) => (
          <div key={c.title} className="myapp-consent-clause">
            <button className="myapp-consent-clause-head" onClick={() => setOpenClause(openClause === i ? null : i)}>
              <span>{c.title}</span>
              {openClause === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openClause === i && (
              <div className="myapp-consent-clause-body">
                {c.body.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            )}
          </div>
        ))}

        <div className="myapp-consent-extra">
          <span className="myapp-consent-extra-label">Contacto de emergencia (opcional)</span>
          <input className="myapp-consent-input" placeholder="Nombre" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
          <input className="myapp-consent-input" placeholder="Teléfono" inputMode="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
        </div>
        <div className="myapp-consent-extra">
          <span className="myapp-consent-extra-label">Condiciones médicas / alergias (opcional)</span>
          <input className="myapp-consent-input" placeholder='Escribe "Ninguna" si no aplica' value={medical} onChange={e => setMedical(e.target.value)} />
        </div>

        <div className="myapp-consent-decls">
          {DECLS.map((d, i) => (
            <label key={i} className="myapp-consent-decl">
              <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />
              <span>{d}</span>
            </label>
          ))}
        </div>

        {error && <p className="myapp-login-error">{error}</p>}

        <button className="myapp-login-btn myapp-consent-submit" disabled={!allChecked || saving} onClick={submit}>
          <ShieldCheck size={16} />
          {saving ? 'Guardando…' : `Acepto, firmado por ${attendee.name}`}
        </button>
        <p className="myapp-consent-note">
          Al aceptar queda constancia de tu nombre, fecha y hora como evidencia de esta aceptación electrónica.
        </p>
      </div>
    </div>
  );
}
