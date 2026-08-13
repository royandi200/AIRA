/**
 * Redimensiona (sin agrandar) y convierte a WebP — mismo patrón usado en
 * BarDJ AI para las fotos de platos. sharp es un binario nativo — se
 * importa DINÁMICAMENTE y con try/catch: un import estático a nivel de
 * módulo que falle (ej. binario equivocado para el runtime de Vercel)
 * tumbaría toda la función antes de llegar a cualquier try/catch propio.
 */
export async function optimizarImagen(
  buffer: Buffer,
  { maxDimension = 1600, quality = 80 }: { maxDimension?: number; quality?: number } = {}
): Promise<{ buffer: Buffer; contentType: 'image/webp' }> {
  const { default: sharp } = await import('sharp');
  const salida = await sharp(buffer)
    .rotate() // respeta el EXIF orientation (fotos de celular vienen rotadas)
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return { buffer: salida, contentType: 'image/webp' };
}
