import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Props { open: boolean; onClose: () => void; initialTab?: 'terminos' | 'privacidad' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left group">
        <span className="text-sm font-semibold text-white/90 group-hover:text-aira-lime transition-colors">{title}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}/>
      </button>
      {open && <div className="pb-5 text-sm text-white/55 leading-relaxed space-y-2">{children}</div>}
    </div>
  )
}

export default function PoliticasModal({ open, onClose, initialTab = 'terminos' }: Props) {
  const [tab, setTab] = useState<'terminos' | 'privacidad'>(initialTab);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}/>

      {/* Panel */}
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-[#0a0a0f] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-[10px] tracking-widest text-aira-lime uppercase font-mono mb-1">AIRA Festival</p>
            <h2 className="text-lg font-display font-bold text-white">Políticas del Evento</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/60"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-3 shrink-0">
          {(['terminos', 'privacidad'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                tab === t ? 'bg-aira-lime text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              {t === 'terminos' ? 'Términos y Devoluciones' : 'Política de Privacidad'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {tab === 'terminos' && (
            <div className="space-y-1">
              <p className="text-xs text-white/30 mb-5">Última actualización: mayo 2025 · Aplica a todos los productos AIRA (tickets, suites, cabañas, add-ons)</p>

              <Section title="1. Compra y confirmación">
                <p>La compra de cualquier producto AIRA (tickets, suites, cabañas y add-ons) se confirma únicamente cuando el organizador valida el pago y envía la confirmación por WhatsApp o correo electrónico.</p>
                <p>AIRA se reserva el derecho de rechazar una reserva si el pago no se confirma dentro de las 24 horas siguientes a la solicitud, liberando el cupo automáticamente.</p>
                <p>Los precios incluyen todos los impuestos aplicables. El cargo por servicio de la plataforma no es reembolsable bajo ninguna circunstancia, pues el servicio de procesamiento fue prestado en su totalidad.</p>
              </Section>

              <Section title="2. Política de devoluciones — Cancelación del evento">
                <p><strong className="text-white/80">Cancelación total por parte del organizador:</strong> Si AIRA cancela el evento de forma definitiva y no reprograma una nueva fecha, el comprador recibirá el reembolso del 100% del valor pagado, incluyendo el cargo por servicio, dentro de los 15 días hábiles siguientes al anuncio oficial de cancelación. La devolución se realizará exclusivamente al mismo medio de pago utilizado en la compra.</p>
                <p><strong className="text-white/80">Aplazamiento o cambio de fecha:</strong> Si el evento se reprograma, el comprador tiene 5 días hábiles desde el anuncio oficial para solicitar el reembolso total. Transcurrido ese plazo sin solicitud, se entenderá que acepta la nueva fecha y su compra permanece válida.</p>
                <p><strong className="text-white/80">Cambio de venue o ubicación:</strong> Si el cambio de locación implica una alteración sustancial de la experiencia ofrecida, el comprador podrá solicitar reembolso dentro de las 72 horas siguientes al anuncio.</p>
              </Section>

              <Section title="3. Política de devoluciones — Decisión del comprador">
                <p><strong className="text-white/80">No asistencia:</strong> AIRA no realiza reembolsos cuando el comprador decide no asistir, independientemente del motivo. Las entradas no son transferibles salvo autorización expresa del organizador.</p>
                <p><strong className="text-white/80">Error en la compra:</strong> Si el comprador seleccionó un producto incorrecto, puede contactar al equipo dentro de las 24 horas siguientes a la compra. Pasado ese tiempo, no se admiten cambios ni devoluciones.</p>
                <p><strong className="text-white/80">Retracto:</strong> Si compraste en línea, tienes 5 días hábiles desde la compra para retractarte sin penalidad, siempre que el evento no haya ocurrido (Ley 1480/2011, Art. 47). Ver sección 5.</p>
              </Section>

              <Section title="4. Fuerza mayor y caso fortuito">
                <p>Si el evento se cancela o suspende por causas de fuerza mayor —incluyendo pero no limitado a: fenómenos climáticos extremos, orden público, restricciones gubernamentales, emergencias sanitarias o causas similares fuera del control del organizador— AIRA no estará obligado a realizar reembolsos, conforme a lo establecido en el Código Civil colombiano y el Estatuto del Consumidor.</p>
                <p>En estos casos, AIRA procurará ofrecer una alternativa razonable (nueva fecha, crédito para futuros eventos) como gesto de buena voluntad, sin que esto constituya una obligación legal.</p>
              </Section>

              <Section title="5. Derecho de retracto (Ley 1480/2011, Art. 47)">
                <p>Si realizaste tu compra en línea (a distancia), tienes derecho a retractarte dentro de los <strong className="text-white/80">5 días hábiles siguientes a la fecha de compra o abono</strong>, siempre que el evento aún no haya ocurrido. No necesitas justificación ni pagas penalidad alguna.</p>
                <p>Para ejercerlo, sigue el procedimiento del punto 6. De proceder, AIRA tiene hasta 30 días calendario para devolver el valor completo pagado.</p>
              </Section>

              <Section title="6. Procedimiento para solicitar devolución">
                <p>1. Envía un correo a <strong className="text-white/70">info@viveaira.live</strong> con el asunto: "DEVOLUCIÓN – [Número de reserva]"</p>
                <p>2. Incluye: nombre completo, número de documento, número de reserva y motivo de la solicitud.</p>
                <p>3. AIRA responderá dentro de los 3 días hábiles siguientes para informar si procede la devolución.</p>
                <p>4. De proceder, el reembolso se efectuará en el mismo medio de pago original en un plazo de hasta 30 días calendario para retracto, o hasta 15 días hábiles para los demás casos. No se realizan devoluciones en efectivo (SAGRILAFT).</p>
              </Section>

              <Section title="6. Comportamiento y acceso al evento">
                <p>AIRA se reserva el derecho de negar el ingreso o retirar del evento a cualquier persona que presente comportamientos que atenten contra la seguridad, el orden o la convivencia, sin derecho a reembolso.</p>
                <p>El ingreso bajo los efectos del alcohol o sustancias psicoactivas puede ser motivo de negación de acceso sin devolución del valor pagado.</p>
              </Section>

              <Section title="7. Ley aplicable">
                <p>Estos términos se rigen por las leyes de la República de Colombia, en particular la Ley 1480 de 2011 (Estatuto del Consumidor) y sus decretos reglamentarios. Cualquier controversia será resuelta ante la Superintendencia de Industria y Comercio (SIC) o los jueces competentes de Colombia.</p>
              </Section>
            </div>
          )}

          {tab === 'privacidad' && (
            <div className="space-y-1">
              <p className="text-xs text-white/30 mb-5">Conforme a la Ley 1581 de 2012 (Habeas Data) y el Decreto 1377 de 2013 · Colombia</p>

              <Section title="1. Responsable del tratamiento">
                <p><strong className="text-white/80">AIRA Festival</strong><br/>Correo: info@viveaira.live<br/>Instagram: @airafestival<br/>Colombia</p>
              </Section>

              <Section title="2. Datos que recopilamos">
                <p>Al realizar una reserva o compra en viveaira.live, recopilamos: nombre completo, número de documento de identidad, número de teléfono celular, correo electrónico y método de pago (sin almacenar datos de tarjetas).</p>
                <p>También recopilamos de forma automática: dirección IP, tipo de dispositivo y navegador, para fines de seguridad y mejora del servicio.</p>
              </Section>

              <Section title="3. Finalidad del tratamiento">
                <p>Tus datos se usan para: procesar y confirmar tu reserva, enviarte información del evento, gestionar accesos y control de ingreso, cumplir obligaciones legales y tributarias, y mejorar la experiencia del festival.</p>
                <p>No usamos tus datos para publicidad de terceros ni los vendemos a ningún tercero.</p>
              </Section>

              <Section title="4. Compartición de datos">
                <p>Tus datos pueden ser compartidos únicamente con: proveedores de procesamiento de pago (bajo acuerdos de confidencialidad), equipo de seguridad y logística del evento para control de acceso, y autoridades competentes cuando sea exigido por ley.</p>
              </Section>

              <Section title="5. Derechos del titular (Habeas Data)">
                <p>Como titular de tus datos personales tienes derecho a: conocer, actualizar y rectificar tu información; solicitar prueba de la autorización otorgada; ser informado sobre el uso de tus datos; revocar la autorización; y presentar quejas ante la Superintendencia de Industria y Comercio.</p>
                <p>Para ejercer estos derechos escribe a <strong className="text-white/70">info@viveaira.live</strong> indicando tu nombre, número de documento y la solicitud.</p>
              </Section>

              <Section title="6. Conservación de datos">
                <p>Tus datos se conservan durante la vigencia del evento y hasta 5 años después, conforme a obligaciones legales y tributarias colombianas. Pasado ese plazo, se eliminan de forma segura.</p>
              </Section>

              <Section title="7. Seguridad">
                <p>Implementamos medidas técnicas y organizativas para proteger tu información contra acceso no autorizado, pérdida o divulgación. Sin embargo, ningún sistema es 100% seguro; en caso de brecha de seguridad que afecte tus derechos, serás notificado conforme a la ley.</p>
              </Section>

              <Section title="8. Cambios en esta política">
                <p>AIRA puede actualizar esta política. Los cambios serán publicados en viveaira.live con al menos 10 días de anticipación. El uso continuado del sitio tras los cambios implica aceptación.</p>
              </Section>
            </div>
          )}

          <p className="text-[10px] text-white/20 text-center mt-8 pb-2">
            ¿Dudas? Escríbenos a info@viveaira.live · AIRA Festival · Colombia
          </p>
        </div>
      </div>
    </div>
  )
}
