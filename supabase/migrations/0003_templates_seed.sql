-- 0003: plantillas legales globales (Bolivia). Modelos referenciales, sin citas de normas concretas.
-- firm_id nulo = plantilla del sistema (solo lectura para los despachos). Idempotente por slug.

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-arrendamiento', 'Contrato de arrendamiento', 'Civil', 'Alquiler de un inmueble entre arrendador y arrendatario.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de arrendamiento</h1>
<p>Conste por el presente documento que en la ciudad de {{ciudad}}, a {{fecha}}, se suscribe un contrato de arrendamiento al tenor de las siguientes cláusulas:</p>
<h2>Primera. Partes</h2>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en calidad de ARRENDADOR; y {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, en calidad de ARRENDATARIO.</p>
<h2>Segunda. Objeto</h2>
<p>El arrendador da en alquiler al arrendatario el inmueble ubicado en: {{inmueble_descripcion}}.</p>
<h2>Tercera. Canon y forma de pago</h2>
<p>El canon mensual es de Bs {{monto}} ({{monto_literal}}), que será pagado por mes adelantado.</p>
<h2>Cuarta. Plazo</h2>
<p>El contrato tendrá una duración de {{plazo_meses}} meses, computables desde el {{fecha_inicio}}.</p>
<h2>Quinta. Obligaciones</h2>
<p>El arrendatario usará el inmueble solo para vivienda o el fin pactado, lo mantendrá en buen estado y lo devolverá en las condiciones en que lo recibió. Los servicios básicos corren por cuenta del arrendatario.</p>
<h2>Sexta. Conformidad</h2>
<p>Ambas partes declaran su plena conformidad con el contenido de este documento y lo firman en dos ejemplares.</p>
<p>{{cliente_nombre}} (arrendador)</p>
<p>{{contraparte_nombre}} (arrendatario)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'compraventa-inmueble', 'Contrato de compraventa de inmueble', 'Civil', 'Transferencia de un inmueble a cambio de un precio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de compraventa de inmueble</h1>
<p>En la ciudad de {{ciudad}}, a {{fecha}}, comparecen {{cliente_nombre}}, con C.I. {{cliente_ci}}, en calidad de VENDEDOR, y {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, en calidad de COMPRADOR, quienes convienen en lo siguiente:</p>
<h2>Primera. Antecedentes</h2>
<p>El vendedor declara ser propietario del inmueble ubicado en: {{inmueble_descripcion}}, libre de gravámenes según declara.</p>
<h2>Segunda. Venta y precio</h2>
<p>El vendedor transfiere el inmueble al comprador por el precio de Bs {{monto}} ({{monto_literal}}), que el comprador pagará en la forma que las partes acuerden por escrito.</p>
<h2>Tercera. Entrega</h2>
<p>La entrega del inmueble se realizará a la firma de este contrato, con todos sus accesorios y servicios.</p>
<h2>Cuarta. Saneamiento</h2>
<p>El vendedor responde por la legítima propiedad del inmueble y se obliga a realizar los trámites de transferencia necesarios, conforme a ley.</p>
<h2>Quinta. Conformidad</h2>
<p>Las partes aceptan todas las cláusulas y se comprometen a elevar este documento a escritura pública.</p>
<p>{{cliente_nombre}} (vendedor)</p>
<p>{{contraparte_nombre}} (comprador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'compraventa-vehiculo', 'Contrato de compraventa de vehículo', 'Civil', 'Venta de un vehículo con entrega y transferencia.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de compraventa de vehículo</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, con C.I. {{cliente_ci}} (VENDEDOR), y {{contraparte_nombre}}, con C.I. {{contraparte_ci}} (COMPRADOR), suscriben este contrato:</p>
<h2>Primera. Objeto</h2>
<p>El vendedor transfiere al comprador el siguiente vehículo: {{vehiculo_descripcion}}.</p>
<h2>Segunda. Precio</h2>
<p>El precio pactado es de Bs {{monto}} ({{monto_literal}}), que el vendedor declara recibir a su entera satisfacción.</p>
<h2>Tercera. Estado y entrega</h2>
<p>El comprador recibe el vehículo en el estado en que se encuentra, que declara conocer. La entrega se hace en este acto.</p>
<h2>Cuarta. Trámites</h2>
<p>Las partes realizarán juntas los trámites de transferencia ante las oficinas correspondientes. Las deudas e infracciones anteriores a la fecha son responsabilidad del vendedor.</p>
<p>{{cliente_nombre}} (vendedor)</p>
<p>{{contraparte_nombre}} (comprador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"vehiculo_descripcion","label":"Datos del vehículo (marca, modelo, año, placa, chasis)","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'anticresis', 'Contrato de anticresis', 'Civil', 'Entrega de un inmueble en garantía de un préstamo, con uso por el acreedor.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de anticresis</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, con C.I. {{cliente_ci}}, propietario (ANTICRESISTA), y {{contraparte_nombre}}, con C.I. {{contraparte_ci}} (ACREEDOR ANTICRÉTICO), acuerdan:</p>
<h2>Primera. Inmueble</h2>
<p>El inmueble objeto del contrato está ubicado en: {{inmueble_descripcion}}.</p>
<h2>Segunda. Monto entregado</h2>
<p>El acreedor entrega la suma de Bs {{monto}} ({{monto_literal}}) al propietario, quien la recibe a título de anticresis.</p>
<h2>Tercera. Plazo y uso</h2>
<p>El contrato dura {{plazo_meses}} meses desde el {{fecha_inicio}}. Durante ese tiempo el acreedor ocupa el inmueble y lo cuida como bien ajeno.</p>
<h2>Cuarta. Devolución</h2>
<p>Vencido el plazo, el propietario devolverá el monto recibido y el acreedor entregará el inmueble libre y desocupado.</p>
<p>{{cliente_nombre}} (propietario)</p>
<p>{{contraparte_nombre}} (acreedor)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-prestamo', 'Contrato de préstamo de dinero', 'Civil', 'Préstamo con plazo de devolución e interés.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de préstamo de dinero</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, C.I. {{cliente_ci}} (PRESTAMISTA), y {{contraparte_nombre}}, C.I. {{contraparte_ci}} (PRESTATARIO), celebran el siguiente contrato:</p>
<h2>Primera. Monto</h2>
<p>El prestamista entrega al prestatario la suma de Bs {{monto}} ({{monto_literal}}), que este declara haber recibido.</p>
<h2>Segunda. Interés</h2>
<p>El préstamo devenga un interés mensual del {{interes_mensual}} %.</p>
<h2>Tercera. Plazo de devolución</h2>
<p>El prestatario devolverá el capital y los intereses en el plazo de {{plazo_meses}} meses, hasta el {{fecha_limite}}.</p>
<h2>Cuarta. Incumplimiento</h2>
<p>Si el prestatario no paga en la fecha fijada, el prestamista podrá exigir el pago por las vías que corresponden conforme a ley.</p>
<p>{{cliente_nombre}} (prestamista)</p>
<p>{{contraparte_nombre}} (prestatario)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"interes_mensual","label":"Interés mensual (%)","type":"numero"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'reconocimiento-deuda', 'Documento de reconocimiento de deuda', 'Civil', 'El deudor reconoce una deuda y se compromete a pagarla.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Reconocimiento de deuda</h1>
<p>Yo, {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, domiciliado en {{contraparte_domicilio}}, reconozco voluntariamente que adeudo a {{cliente_nombre}}, con C.I. {{cliente_ci}}, la suma de Bs {{monto}} ({{monto_literal}}), por concepto de {{concepto}}.</p>
<p>Me comprometo a pagar esta deuda hasta el {{fecha_limite}}, en el domicilio del acreedor o por el medio que él indique.</p>
<p>Este documento se firma de manera libre y voluntaria, sin presión alguna, y sirve como prueba de la obligación asumida.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{contraparte_nombre}}</p>
<p>C.I. {{contraparte_ci}}</p>$tpl$,
'[{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'servicios-profesionales', 'Contrato de servicios profesionales', 'Civil', 'Prestación de servicios independientes con honorarios.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de servicios profesionales</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}} (CONTRATANTE), representada por {{empresa_representante}}, y {{cliente_nombre}}, C.I. {{cliente_ci}} (PROFESIONAL), acuerdan:</p>
<h2>Primera. Servicio</h2>
<p>El profesional prestará los siguientes servicios: {{objeto}}.</p>
<h2>Segunda. Honorarios</h2>
<p>Los honorarios son de Bs {{monto}} ({{monto_literal}}), pagaderos en la forma acordada por las partes.</p>
<h2>Tercera. Plazo</h2>
<p>El servicio se prestará durante {{plazo_meses}} meses desde el {{fecha_inicio}}.</p>
<h2>Cuarta. Independencia</h2>
<p>El profesional presta sus servicios de manera independiente, sin relación de dependencia laboral con el contratante.</p>
<h2>Quinta. Confidencialidad</h2>
<p>El profesional mantendrá en reserva la información a la que acceda por este contrato.</p>
<p>{{empresa_representante}} (contratante)</p>
<p>{{cliente_nombre}} (profesional)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"empresa_representante","label":"Representante legal","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'recibo-pago', 'Recibo de pago', 'Civil', 'Constancia de haber recibido una suma de dinero.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Recibo de pago</h1>
<p>Recibí de {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, la suma de Bs {{monto}} ({{monto_literal}}), por concepto de {{concepto}}.</p>
<p>Con el pago recibido, declaro estar satisfecho por lo que corresponde al concepto indicado.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'transaccion-extrajudicial', 'Transacción extrajudicial', 'Civil', 'Acuerdo entre las partes para terminar una controversia sin juicio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Transacción extrajudicial</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, C.I. {{cliente_ci}}, y {{contraparte_nombre}}, C.I. {{contraparte_ci}}, deciden poner fin de manera amistosa a la controversia descrita a continuación.</p>
<h2>Primera. Antecedentes</h2>
<p>{{hechos}}</p>
<h2>Segunda. Acuerdo</h2>
<p>Para terminar la controversia, las partes acuerdan lo siguiente: {{petitorio}}.</p>
<h2>Tercera. Pago</h2>
<p>Si corresponde, se pagará la suma de Bs {{monto}} ({{monto_literal}}) hasta el {{fecha_limite}}.</p>
<h2>Cuarta. Efectos</h2>
<p>Cumplido el acuerdo, las partes se otorgan el más amplio finiquito y renuncian a reclamarse por este asunto.</p>
<p>{{cliente_nombre}}</p>
<p>{{contraparte_nombre}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'demanda-divorcio', 'Demanda de divorcio', 'Familia', 'Memorial para iniciar el proceso de divorcio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Demanda de divorcio</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Demanda de divorcio</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto me presento y digo:</p>
<h2>I. Partes</h2>
<p>Demando a {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, con domicilio en {{contraparte_domicilio}}.</p>
<h2>II. Hechos</h2>
<p>{{hechos}}</p>
<h2>III. Petitorio</h2>
<p>Solicito que, previo el trámite que corresponde conforme a ley, se declare el divorcio y se resuelvan los efectos relativos a los hijos y a los bienes: {{petitorio}}.</p>
<h2>Otrosí</h2>
<p>Pido se señale audiencia y se notifique a la parte demandada en el domicilio indicado.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'demanda-asistencia-familiar', 'Demanda de asistencia familiar', 'Familia', 'Solicitud de pensión para hijos o dependientes.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Demanda de asistencia familiar</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Demanda de asistencia familiar</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, en representación del menor {{menor_nombre}}, de {{menor_edad}} años, con el debido respeto digo:</p>
<h2>I. Hechos</h2>
<p>{{hechos}}</p>
<h2>II. Petitorio</h2>
<p>Solicito que se fije una asistencia familiar mensual de Bs {{monto}} ({{monto_literal}}), a cargo de {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, domiciliado en {{contraparte_domicilio}}, y que se disponga su descuento y pago regular.</p>
<h2>Otrosí</h2>
<p>Ofrezco como prueba los documentos que acompaño y pido que se notifique al demandado en su domicilio.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-guarda', 'Solicitud de guarda de menor', 'Familia', 'Pedido de guarda de un niño, niña o adolescente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Solicitud de guarda</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de guarda</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto expongo:</p>
<h2>I. Situación del menor</h2>
<p>El menor {{menor_nombre}}, de {{menor_edad}} años, se encuentra actualmente en las siguientes circunstancias: {{hechos}}.</p>
<h2>II. Petitorio</h2>
<p>Solicito que se me otorgue la guarda del menor, tomando en cuenta su interés superior, y que se cite a {{contraparte_nombre}} para que se pronuncie. {{petitorio}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'autorizacion-viaje-menor', 'Autorización de viaje de menor', 'Familia', 'Permiso de un padre o madre para que un menor viaje.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Autorización de viaje de menor</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en mi calidad de padre o madre, AUTORIZO expresamente el viaje del menor {{menor_nombre}}, de {{menor_edad}} años, con destino a {{destino}}.</p>
<p>El viaje se realizará el {{fecha_viaje}} y el retorno está previsto para el {{fecha_retorno}}. El menor viajará acompañado de {{apoderado_nombre}}, con C.I. {{apoderado_ci}}.</p>
<p>Esta autorización se otorga de manera libre y voluntaria para presentarla ante las autoridades que la requieran.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"destino","label":"Lugar de destino","type":"texto"},{"key":"fecha_viaje","label":"Fecha de viaje","type":"fecha"},{"key":"fecha_retorno","label":"Fecha de retorno","type":"fecha"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-trabajo', 'Contrato de trabajo', 'Laboral', 'Relación laboral entre empleador y trabajador.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de trabajo</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}}, representada por {{empresa_representante}} (EMPLEADOR), y {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}} (TRABAJADOR), suscriben este contrato:</p>
<h2>Primera. Cargo</h2>
<p>El trabajador desempeñará el cargo de {{cargo}}, con las funciones propias del puesto.</p>
<h2>Segunda. Salario</h2>
<p>El salario mensual es de Bs {{monto}} ({{monto_literal}}), pagadero por mes vencido, más los beneficios que correspondan conforme a ley.</p>
<h2>Tercera. Inicio y duración</h2>
<p>La relación laboral comienza el {{fecha_inicio}}. Se establece un periodo de prueba de acuerdo con lo que la normativa laboral permite.</p>
<h2>Cuarta. Jornada</h2>
<p>La jornada de trabajo se cumplirá según el horario acordado por las partes y las normas laborales vigentes.</p>
<h2>Quinta. Conformidad</h2>
<p>Las partes firman en señal de conformidad.</p>
<p>{{empresa_representante}} (empleador)</p>
<p>{{cliente_nombre}} (trabajador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"empresa_representante","label":"Representante legal","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-renuncia', 'Carta de renuncia', 'Laboral', 'Carta del trabajador comunicando su renuncia.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señores</p>
<p>{{empresa_nombre}}</p>
<p>Presente.-</p>
<p>Ref.: Renuncia voluntaria al cargo de {{cargo}}</p>
<p>De mi consideración:</p>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, comunico de manera voluntaria mi renuncia al cargo de {{cargo}}, que desempeño en su institución, a partir del {{fecha_limite}}.</p>
<p>Agradezco la oportunidad brindada y solicito se me haga conocer el cálculo de mis beneficios sociales para su pago oportuno.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-reincorporacion', 'Memorial de reincorporación laboral', 'Laboral', 'Solicitud de reincorporación por despido.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Inspector del Trabajo / Autoridad laboral competente de {{ciudad}}</p>
<p>Ref.: Solicitud de reincorporación</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de reincorporación laboral</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto expongo:</p>
<h2>I. Relación laboral</h2>
<p>Presto servicios a {{empresa_nombre}} como {{cargo}}, con un salario mensual de Bs {{salario}}, desde el {{fecha_inicio}}.</p>
<h2>II. Hechos</h2>
<p>{{hechos}}</p>
<h2>III. Petitorio</h2>
<p>Solicito que se disponga mi reincorporación al puesto de trabajo, con el pago de los salarios devengados, y que se cite a la parte empleadora para la audiencia que corresponda.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"salario","label":"Salario mensual en bolivianos","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'finiquito', 'Finiquito laboral', 'Laboral', 'Constancia de pago de beneficios al terminar la relación laboral.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Finiquito laboral</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, declaro que presté servicios a {{empresa_nombre}} como {{cargo}} desde el {{fecha_inicio}} hasta el {{fecha_limite}}.</p>
<p>Declaro haber recibido la suma total de Bs {{monto}} ({{monto_literal}}) por concepto de beneficios sociales y demás derechos que me corresponden, detallados en la liquidación que acompaño.</p>
<p>Con este pago me considero satisfecho y no tengo nada más que reclamar por la relación laboral, salvo lo que la ley no permita renunciar.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'denuncia', 'Denuncia penal', 'Penal', 'Denuncia de un hecho ante el Ministerio Público.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Fiscal de Materia de turno de {{ciudad}}</p>
<p>Ref.: Denuncia</p>
<h1>Denuncia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, teléfono {{cliente_telefono}}, con el debido respeto presento denuncia contra {{denunciado_nombre}}, en base a lo siguiente:</p>
<h2>I. Hechos</h2>
<p>El día {{fecha_hechos}} ocurrió lo siguiente: {{hechos}}.</p>
<h2>II. Petitorio</h2>
<p>Solicito que se admita la denuncia, se inicien las investigaciones y se practiquen las diligencias necesarias para esclarecer los hechos. {{petitorio}}</p>
<h2>Otrosí</h2>
<p>Ofrezco las pruebas que acompaño y las que se obtengan durante la investigación.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"cliente_telefono","label":"Teléfono del cliente","type":"texto"},{"key":"denunciado_nombre","label":"Nombre de la persona denunciada","type":"texto"},{"key":"fecha_hechos","label":"Fecha de los hechos","type":"fecha"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'querella', 'Querella', 'Penal', 'Acusación particular de la víctima en un proceso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez de Instrucción Penal de turno de {{ciudad}}</p>
<p>Ref.: Querella</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Querella</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en calidad de víctima, con el debido respeto me constituyo en querellante contra {{denunciado_nombre}}.</p>
<h2>I. Relato de los hechos</h2>
<p>{{hechos}}</p>
<h2>II. Petitorio</h2>
<p>Pido que se admita la querella, se me tenga como parte querellante y se disponga la investigación y el procesamiento que correspondan. {{petitorio}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"denunciado_nombre","label":"Nombre de la persona denunciada","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-audiencia-penal', 'Memorial de solicitud de audiencia', 'Penal', 'Pedido de señalamiento de audiencia en un proceso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Solicitud de audiencia</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de audiencia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto expongo y solicito:</p>
<p>Que se señale día y hora de audiencia para considerar lo siguiente: {{asunto}}.</p>
<p>Fundamento mi pedido en los siguientes hechos: {{hechos}}.</p>
<p>Pido que se notifique a todas las partes en sus domicilios procesales.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'apersonamiento-penal', 'Memorial de apersonamiento (penal)', 'Penal', 'El abogado se presenta como defensor en un caso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Apersonamiento y señalamiento de domicilio</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Apersonamiento</h1>
<p>{{abogado_nombre}}, abogado, en representación de {{cliente_nombre}}, con C.I. {{cliente_ci}}, según el poder que acompaño, con el debido respeto digo:</p>
<p>Que me apersono al presente caso en defensa de mi mandante y pido que se me tenga como su representante, notificándome en el domicilio procesal que señalo: {{domicilio_legal}}.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'acta-constitucion', 'Acta de constitución de sociedad', 'Comercial y societario', 'Acta de fundación de una sociedad entre dos socios.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Acta de constitución de sociedad</h1>
<p>En la ciudad de {{ciudad}}, a {{fecha}}, se reúnen {{cliente_nombre}}, con C.I. {{cliente_ci}}, y {{socio2_nombre}}, con C.I. {{socio2_ci}}, con el propósito de constituir una sociedad.</p>
<h2>Primero. Denominación y domicilio</h2>
<p>La sociedad se denominará {{denominacion}} y tendrá su domicilio legal en {{domicilio_legal}}.</p>
<h2>Segundo. Objeto</h2>
<p>La sociedad tendrá por objeto: {{objeto}}.</p>
<h2>Tercero. Capital</h2>
<p>El capital social es de Bs {{capital}}, aportado por los socios en la proporción que acuerden por escrito.</p>
<h2>Cuarto. Duración</h2>
<p>La sociedad tendrá una duración de {{duracion_anios}} años, que podrá prorrogarse por decisión de los socios.</p>
<h2>Quinto. Administración</h2>
<p>La administración y representación estarán a cargo de {{cliente_nombre}}, con las facultades que los socios definan.</p>
<p>Firman en señal de conformidad:</p>
<p>{{cliente_nombre}}</p>
<p>{{socio2_nombre}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"socio2_nombre","label":"Nombre del segundo socio","type":"texto"},{"key":"socio2_ci","label":"Cédula de identidad del segundo socio","type":"texto"},{"key":"denominacion","label":"Denominación de la sociedad","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"capital","label":"Capital social en bolivianos","type":"numero"},{"key":"duracion_anios","label":"Duración en años","type":"numero"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-representacion', 'Poder de representación', 'Comercial y societario', 'Otorga a una persona la facultad de representar a otra.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder de representación</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, otorgo poder a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, para que me represente en los siguientes asuntos: {{objeto}}.</p>
<p>El apoderado podrá realizar todos los actos necesarios para el cumplimiento de este encargo y firmar los documentos que se requieran.</p>
<p>Este poder se otorga por {{plazo_meses}} meses a partir de su firma.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-especial', 'Poder especial', 'Comercial y societario', 'Poder limitado a un acto o trámite determinado.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder especial</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, confiero PODER ESPECIAL a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, únicamente para: {{facultades}}.</p>
<p>El apoderado no podrá realizar actos distintos a los indicados. Los actos realizados dentro de este encargo me obligarán como si los hubiese hecho yo mismo.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"facultades","label":"Facultades que se otorgan","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-general', 'Poder general', 'Comercial y societario', 'Poder amplio para administrar asuntos del poderdante.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder general</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, otorgo PODER GENERAL a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, para que en mi nombre administre mis asuntos y bienes, y me represente ante personas e instituciones públicas y privadas.</p>
<p>Las facultades principales son: {{facultades}}.</p>
<p>Los actos que excedan la simple administración requerirán la autorización expresa que exija la ley.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"facultades","label":"Facultades que se otorgan","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-notariada', 'Carta notariada', 'Comercial y societario', 'Comunicación formal que se hace llegar por medio de notaría.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señor(a)</p>
<p>{{contraparte_nombre}}</p>
<p>{{contraparte_domicilio}}</p>
<p>Presente.-</p>
<p>Ref.: {{asunto}}</p>
<p>CARTA NOTARIADA</p>
<p>De mi consideración:</p>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, me dirijo a usted para comunicarle formalmente lo siguiente: {{hechos}}.</p>
<p>Por lo expuesto, solicito que en el plazo de {{plazo_dias}} días cumpla con lo siguiente: {{petitorio}}. En caso contrario, me veré obligado a acudir a las instancias que correspondan.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"plazo_dias","label":"Plazo en días","type":"numero"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'confidencialidad', 'Contrato de confidencialidad', 'Comercial y societario', 'Compromiso de reserva sobre información compartida.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de confidencialidad</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}} (PARTE QUE REVELA) y {{contraparte_nombre}}, C.I. {{contraparte_ci}} (PARTE QUE RECIBE), acuerdan:</p>
<h2>Primera. Información confidencial</h2>
<p>Es confidencial toda información que la parte que revela comparta de manera oral, escrita o digital sobre: {{objeto}}.</p>
<h2>Segunda. Obligación</h2>
<p>La parte que recibe se compromete a no divulgar ni usar la información para fines distintos a los acordados.</p>
<h2>Tercera. Duración</h2>
<p>Esta obligación dura {{duracion_anios}} años contados desde la fecha de este documento.</p>
<h2>Cuarta. Incumplimiento</h2>
<p>El incumplimiento dará lugar al reclamo de los daños y perjuicios que correspondan conforme a ley.</p>
<p>{{empresa_representante}} (parte que revela)</p>
<p>{{contraparte_nombre}} (parte que recibe)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"duracion_anios","label":"Duración en años","type":"numero"},{"key":"empresa_representante","label":"Representante legal","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-apersonamiento', 'Memorial de apersonamiento', 'General', 'Presentación del abogado y de su cliente ante un juzgado.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Apersonamiento</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Apersonamiento</h1>
<p>{{abogado_nombre}}, abogado, en representación de {{cliente_nombre}}, con C.I. {{cliente_ci}}, con el debido respeto digo:</p>
<p>Que me apersono al caso de referencia y pido que se me tenga como representante de mi mandante en todas las actuaciones.</p>
<p>Pido que se me notifique en el domicilio que señalo: {{domicilio_legal}}.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-domicilio', 'Memorial de señalamiento de domicilio', 'General', 'Informa el domicilio procesal para notificaciones.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Señalamiento de domicilio procesal</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Señalamiento de domicilio procesal</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto digo:</p>
<p>Que señalo como domicilio procesal para recibir notificaciones el ubicado en {{domicilio_legal}}, y pido que se me notifique en él de todas las actuaciones.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'fotocopias-legalizadas', 'Solicitud de fotocopias legalizadas', 'General', 'Pide copias certificadas de un expediente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Solicitud de fotocopias legalizadas</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de fotocopias legalizadas</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto solicito:</p>
<p>Que se me otorguen fotocopias legalizadas de los siguientes actuados: {{documentos_copias}}.</p>
<p>Declaro que las copias se usarán para fines legales propios del caso, y asumo el costo que corresponda.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"documentos_copias","label":"Documentos o actuados cuya copia se solicita","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-cobranza', 'Carta de cobranza', 'General', 'Recordatorio formal de una deuda pendiente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señor(a)</p>
<p>{{contraparte_nombre}}</p>
<p>{{contraparte_domicilio}}</p>
<p>Presente.-</p>
<p>Ref.: Cobro de deuda pendiente</p>
<p>De mi consideración:</p>
<p>Por medio de la presente le recuerdo que mantiene una deuda de Bs {{monto}} ({{monto_literal}}) por concepto de {{concepto}}.</p>
<p>Le solicito regularizar el pago hasta el {{fecha_limite}}. Si ya realizó el pago, le pido hacerme llegar el comprobante.</p>
<p>De no recibir respuesta, me reservo el derecho de iniciar las acciones que correspondan.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-audiencia', 'Solicitud de audiencia', 'General', 'Pedido de audiencia ante una autoridad.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor(a): {{juzgado}}</p>
<p>Ref.: Solicitud de audiencia</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de audiencia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, con el debido respeto solicito se señale día y hora de audiencia para tratar el siguiente asunto: {{asunto}}.</p>
<p>Motivo: {{motivo}}.</p>
<p>Pido que se notifique a las partes en sus domicilios.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"motivo","label":"Motivo","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;
