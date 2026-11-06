// Tiempos tope del guion (en segundos). `who` aparece en la vista de presentador: asignen a cada quien.
export const SECTIONS = {
  0: { n: '00', title: 'Antesala', who: 'Por asignar', tope: 20 },
  1: { n: '01', title: 'El problema', who: 'Por asignar', tope: 100 },
  2: { n: '02', title: 'Para quién', who: 'Por asignar', tope: 30 },
  3: { n: '03', title: 'Cómo se reporta', who: 'Por asignar', tope: 75 },
  4: { n: '04', title: 'Qué hacemos con el reporte', who: 'Por asignar', tope: 45 },
  5: { n: '05', title: 'La prueba', who: 'Por asignar', tope: 30 },
  6: { n: '06', title: 'Demo en vivo', who: 'Por asignar', tope: 240 },
  7: { n: '07', title: 'Cierre', who: 'Por asignar', tope: 30 },
  x: { n: '··', title: 'Modo stand', who: '—', tope: 0 },
}

export const TOTAL_TOPE = 10 * 60
