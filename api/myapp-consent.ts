/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureConsentSchema, CONSENT_VERSION, hashConsentText } from './lib/myapp-consent.js';

const CLAUSES_TEXT: [string, string[]][] = [
  ['1. Naturaleza del evento', [
    'AIRA es una experiencia recreativa y musical de tres (3) dias y dos (2) noches en Guatape y El Penol (Antioquia), que puede incluir hospedaje en cabanas y suites, transporte terrestre en bus, presentaciones de musica electronica en distintos escenarios —incluidos escenarios al aire libre y junto al embalse (playa/lago)—, uso de piscina y zonas comunes, alimentacion y actividades recreativas.',
  ]],
  ['2. Mayoria de edad y participacion voluntaria', [
    'Declaro ser mayor de 18 anos, tener plena capacidad legal y participar de forma libre, voluntaria y bajo mi propia decision y responsabilidad.',
  ]],
  ['3. Estado de salud y aptitud', [
    'Declaro estar en condiciones fisicas y de salud adecuadas para participar. Informe de manera veraz, en esta pantalla, cualquier condicion medica, alergia o medicamento relevante. Es mi responsabilidad portar mis medicamentos.',
    'Autorizo al Organizador para que, ante una emergencia, gestione mi atencion o traslado medico. Entiendo que los costos de dicha atencion corren por mi cuenta.',
  ]],
  ['4. Asuncion de riesgos', [
    'Reconozco que asistir a un evento de estas caracteristicas conlleva riesgos inherentes que no pueden eliminarse por completo, y los asumo de forma consciente y voluntaria: actividades cerca del agua (embalse, playa y piscina); transporte terrestre y desplazamientos por carretera; terreno natural irregular, pendientes y superficies resbaladizas; condiciones climaticas y exposicion solar; altos niveles de sonido y efectos propios de un evento musical; aglomeraciones y esfuerzo fisico; los efectos de mi consumo voluntario de alimentos o bebidas alcoholicas; y hechos ocasionados por terceros ajenos al control del Organizador.',
    'Participo aceptando estos riesgos por mi cuenta y riesgo, y me hago responsable de mi propia seguridad, integridad y bienes durante todo el evento, incluidos los trayectos de ida y regreso.',
  ]],
  ['5. Alcohol y sustancias', [
    'Si consumo bebidas alcoholicas lo hago de forma responsable y asumo la total responsabilidad por mi estado y mis actos. Esta absolutamente prohibido el porte o consumo de sustancias ilicitas. El Organizador podra retirar del evento, sin derecho a reembolso, a quien incumpla esta norma.',
  ]],
  ['6. Exoneracion de responsabilidad', [
    'En la medida permitida por la ley, exonero y mantengo libre de responsabilidad a AIRA Festival, su equipo, colaboradores, aliados, patrocinadores, proveedores, artistas y a los propietarios/administradores de los predios y alojamientos, respecto de lesion, dano, perdida o gasto derivado de los riesgos que he asumido, de mis propios actos o de hechos de terceros — sin perjuicio de lo que la ley no permite renunciar (dolo o culpa grave del Organizador).',
  ]],
  ['7. Responsabilidad por danos', [
    'Me hago responsable de los danos que llegue a causar a instalaciones, cabanas, mobiliario, equipos, al entorno natural o a otras personas. Autorizo al Organizador a cobrarme el valor de dichos danos.',
  ]],
  ['8. Objetos personales', [
    'Soy el unico responsable del cuidado de mis objetos personales. AIRA Festival no responde por perdida, hurto o dano de bienes personales durante el evento, el transporte o el hospedaje.',
  ]],
  ['9. Transporte (bus)', [
    'Si uso el transporte, me comprometo a llegar puntualmente al punto y hora de salida; el bus partira a la hora indicada y la no presentacion no genera reembolso ni reprogramacion. El Organizador no responde por retrasos por trafico, clima, orden publico o fuerza mayor.',
  ]],
  ['10. Hospedaje y convivencia', [
    'Me comprometo a cuidar el alojamiento asignado y respetar a los demas huespedes. No se toleraran violencia, acoso, discriminacion ni conductas que afecten la sana convivencia — el incumplimiento faculta al Organizador para retirarme del evento sin reembolso.',
  ]],
  ['11. Instrucciones y seguridad', [
    'Me obligo a seguir las indicaciones del staff, la seguridad y las autoridades, y a no ingresar a areas restringidas.',
  ]],
  ['12. Autorizacion de uso de imagen', [
    'Autorizo libre, expresa, voluntaria, gratuita e indefinidamente a AIRA Festival para captar, grabar, reproducir, editar y utilizar mi imagen, voz y semejanza —fotografias, videos, audios y transmisiones en vivo— tomadas antes, durante y despues del evento.',
    'Esta autorizacion es para fines de memoria, comunicacion, promocion, publicidad y difusion del evento AIRA y sus proximas ediciones, en cualquier medio o plataforma, sin limite de territorio ni de tiempo y sin contraprestacion a mi favor.',
    'Puedo solicitar no ser incluido en futuras publicaciones escribiendo a info@viveaira.live, sin que afecte el material ya divulgado.',
  ]],
  ['13. Tratamiento de datos personales', [
    'Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015, para: registro, control de acceso (incluido el codigo QR), logistica y operacion del evento, seguridad, atencion de emergencias, y comunicaciones del evento y proximas ediciones.',
    'Entiendo que mi informacion de salud y mi imagen son datos sensibles, de entrega facultativa, que autorizo voluntariamente para poder atender emergencias.',
    'Puedo conocer, actualizar, rectificar, suprimir mis datos o revocar esta autorizacion escribiendo a info@viveaira.live.',
  ]],
  ['14. Pagos, cancelaciones y reembolsos', [
    'Los valores pagados no son reembolsables. Mi inasistencia, retiro anticipado o cambio de planes no genera devolucion. La cesion de mi cupo solo procede con autorizacion previa del Organizador.',
  ]],
  ['15. Fuerza mayor y cambios del programa', [
    'Por causas de fuerza mayor (clima, orden publico, salud publica, entre otras), el Organizador podra ajustar, reprogramar o modificar el itinerario, horarios, artistas o actividades. Estos ajustes no dan lugar a reembolso.',
  ]],
  ['16. Disposiciones finales', [
    'Este documento se rige por las leyes de la Republica de Colombia. Declaro que lei y comprendi la totalidad de su contenido antes de aceptarlo.',
  ]],
];

const DECLS_TEXT = [
  'Declaro que lei y entendi la totalidad de este documento y lo acepto libremente.',
  'Soy mayor de 18 anos y participo de forma voluntaria.',
  'Asumo los riesgos descritos (clausula 4) y me hago responsable de mi seguridad, integridad y bienes.',
  'La informacion que entrego, incluida la de salud, es veraz.',
  'Autorizo el uso de mi imagen (fotografia y video) conforme a la clausula 12.',
  'Autorizo el tratamiento de mis datos personales conforme a la clausula 13.',
];

function buildConsentText(): string {
  const clausesPart = CLAUSES_TEXT.map(([title, body]) => `${title}\n${body.join('\n')}`).join('\n\n');
  const declsPart = DECLS_TEXT.map((d, i) => `${i + 1}. ${d}`).join('\n');
  return `${clausesPart}\n\n--- DECLARACIONES ---\n${declsPart}`;
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  ssl:                { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    token,
    contactoEmergenciaNombre,
    contactoEmergenciaTelefono,
    condicionesMedicas,
  } = req.body as Record<string, any>;

  if (!token) return res.status(400).json({ error: 'token requerido' });

  try {
    await ensureConsentSchema(pool);

    const [sessions]: any = await pool.query(
      `SELECT order_ref, name FROM myapp_sessions WHERE token = ? LIMIT 1`,
      [token]
    );
    if (!sessions.length) return res.status(401).json({ error: 'Sesión inválida' });
    const { order_ref, name } = sessions[0];

    await pool.query(
      `UPDATE manual_registros
       SET consent_accepted_at = NOW(),
           contacto_emergencia_nombre = ?,
           contacto_emergencia_telefono = ?,
           condiciones_medicas = ?
       WHERE order_ref = ?`,
      [contactoEmergenciaNombre || null, contactoEmergenciaTelefono || null, condicionesMedicas || null, order_ref]
    );

    const ip = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
    const contentText = buildConsentText();
    const contentHash = hashConsentText(contentText);

    await pool.query(
      `INSERT INTO myapp_consentimientos (order_ref, nombre, version, content_hash, content_text, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_ref, name, CONSENT_VERSION, contentHash, contentText, ip || null, userAgent || null]
    );

    const [rows]: any = await pool.query(
      `SELECT consent_accepted_at FROM manual_registros WHERE order_ref = ? LIMIT 1`,
      [order_ref]
    );

    return res.status(200).json({
      ok: true,
      consentAcceptedAt: rows[0]?.consent_accepted_at || null,
      contentHash,
      ip: ip || null,
      userAgent: userAgent || null,
    });
  } catch (err: any) {
    console.error('[myapp-consent]', err.message);
    return res.status(500).json({ error: 'Error interno al registrar el consentimiento' });
  }
}
