const r = await import(process.argv[2]);
const out = r.evaluarRiesgo({grupo:{metaMinimaHoras:300,fechaTermino:'2026-12-20',creadoEn:'2026-08-01T00:00:00Z'},vinculacion:{id:'v',compromisoSemanal:10,compromisoDesde:'2026-11-01'},jornadas:[{fecha:'2026-11-05',horas:8}],ahora:new Date('2026-11-22T12:00:00Z')});
console.log(JSON.stringify(out,null,1));
