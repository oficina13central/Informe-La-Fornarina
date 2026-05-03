# Informe de Comandas Chazarreta

App web para generar informes imprimibles desde Google Sheets/AppSheet.

## Uso local

```powershell
npm install
npm start
```

Abrir:

```text
http://127.0.0.1:3000
```

## Datos

La app lee estas pestañas del Google Sheet:

- `COMANDA`
- `DETALLE COMANDA`

El ID de la planilla se configura con:

```text
GOOGLE_SHEET_ID
```

Si no se define, usa la planilla actual de Chazarreta.

## Publicacion recomendada

Render es la opcion mas directa para esta app porque usa `server.js` para leer Google Sheets.

Pasos:

1. Subir este proyecto a GitHub.
2. Crear un nuevo Web Service en Render.
3. Conectar el repositorio.
4. Usar:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Configurar `GOOGLE_SHEET_ID` si se quiere cambiar la planilla.

## Flujo mensual

1. AppSheet carga los datos en Google Sheets.
2. Abrir la URL publicada.
3. Elegir periodos y filtros.
4. Imprimir o guardar como PDF.
