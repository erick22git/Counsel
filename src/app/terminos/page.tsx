import { LegalPage } from "@/components/legal/legal-page";
import { TERMS_VERSION } from "@/lib/legal/versions";

export const metadata = { title: "Términos de uso · Counsel" };

export default function Terminos() {
  return (
    <LegalPage title="Términos de uso" version={TERMS_VERSION}>
      <p><strong>Borrador para revisión legal.</strong> Este texto es un modelo de partida: antes de lanzar, un abogado debe revisarlo y adaptarlo a tu razón social, jurisdicción y modelo de cobro.</p>
      <h2>1. Qué es Counsel</h2>
      <p>Counsel es una herramienta de gestión para abogados y despachos: casos, agenda, documentos, cobros y un asistente de apoyo. No presta servicios jurídicos ni sustituye el criterio profesional del abogado.</p>
      <h2>2. Tu cuenta y tu despacho</h2>
      <p>Eres responsable de las claves de acceso y de las personas que invites a tu despacho. Los datos de cada despacho están aislados de los de otros despachos.</p>
      <h2>3. Contenido y confidencialidad</h2>
      <p>Tú conservas la titularidad de los datos y documentos que cargas. Eres responsable de contar con la autorización de tus clientes para tratar sus datos y de respetar el secreto profesional.</p>
      <h2>4. Asistente de inteligencia artificial</h2>
      <p>El asistente ayuda a buscar y redactar. <strong>No reemplaza la verificación oficial en la Gaceta Oficial de Bolivia</strong> y puede cometer errores. Cada respuesta cita su fuente cuando existe; si no hay fuente en la base, lo indica. La decisión y la responsabilidad profesional siguen siendo tuyas. Para generar respuestas, se envían al proveedor de IA solo los datos que la pantalla te muestra antes de cada consulta.</p>
      <h2>5. Uso aceptable</h2>
      <p>No uses el servicio para actividades ilícitas, ni intentes acceder a datos de otros despachos, ni sobrecargar el sistema.</p>
      <h2>6. Disponibilidad y responsabilidad</h2>
      <p>Hacemos esfuerzos razonables por mantener el servicio disponible y respaldado, pero se presta &laquo;tal cual&raquo;. Verifica siempre plazos y fechas críticas en el expediente oficial.</p>
      <h2>7. Cambios</h2>
      <p>Si cambiamos estos términos te pediremos aceptar la nueva versión; queda registrada la fecha de cada aceptación.</p>
    </LegalPage>
  );
}
