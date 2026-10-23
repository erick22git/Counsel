import { LegalPage } from "@/components/legal/legal-page";
import { TERMS_VERSION } from "@/lib/legal/versions";

export const metadata = { title: "Política de privacidad · Counsel" };

export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad" version={TERMS_VERSION}>
      <p><strong>Borrador para revisión legal.</strong> Debe ser revisado por un abogado y adaptado a la normativa boliviana de protección de datos aplicable antes de su publicación.</p>
      <h2>Qué datos tratamos</h2>
      <p>Datos de cuenta (nombre, correo), datos de clientes y casos que tú cargas, documentos, y registros técnicos mínimos (fecha y dirección IP de aceptación de términos, auditoría de uso de IA).</p>
      <h2>Para qué</h2>
      <p>Para prestar el servicio, mantener la seguridad y enviarte avisos (recordatorios de audiencias y plazos).</p>
      <h2>Aislamiento entre despachos</h2>
      <p>Cada despacho solo accede a sus propios datos, garantizado a nivel de base de datos. El personal de Counsel no consulta tus datos salvo soporte que tú solicites.</p>
      <h2>Inteligencia artificial</h2>
      <p>Cuando usas el asistente, se envían a un proveedor de IA (Anthropic) únicamente: tu pregunta, fragmentos de leyes de nuestra base y, si consultas sobre un caso, los datos del caso que la pantalla te muestra antes de enviar. Puedes ocultar los datos personales del cliente. Cada envío queda registrado en un historial de auditoría de tu despacho.</p>
      <h2>Tus derechos</h2>
      <p>Puedes pedir acceso, corrección o eliminación de tus datos escribiendo al administrador de tu despacho o al contacto indicado por el servicio.</p>
      <h2>Conservación y seguridad</h2>
      <p>Conservamos los datos mientras tu cuenta esté activa. Usamos cifrado en tránsito, control de acceso por despacho y copias de seguridad.</p>
    </LegalPage>
  );
}
