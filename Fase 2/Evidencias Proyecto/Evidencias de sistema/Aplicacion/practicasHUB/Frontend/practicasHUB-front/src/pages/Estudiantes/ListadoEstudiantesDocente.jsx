import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const students = [
  { id: 1, initials: 'JB', name: 'Jonatán Barrios', center: 'Municipalidad', practice: 'Práctica profesional', hours: 152, pending: 2, documents: '1 nuevo', status: 'ACTIVA' },
  { id: 2, initials: 'YR', name: 'Yuliana Román', center: 'Empresa Demo', practice: 'Práctica profesional', hours: 210, pending: 1, documents: 'Al día', status: 'ACTIVA' },
  { id: 3, initials: 'NF', name: 'Nicolás Fernández', center: 'Empresa Demo', practice: 'Práctica profesional', hours: 169, pending: 0, documents: 'Al día', status: 'ACTIVA' },
];

const statusOptions = [
  { value: 'TODAS', label: 'Prácticas activas' },
  { value: 'ACTIVA', label: 'Activas' },
  { value: 'PENDIENTE', label: 'Con pendientes' },
];

const ListadoEstudiantesDocente = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODAS');

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchesQuery = student.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === 'TODAS'
      || student.status === status
      || (status === 'PENDIENTE' && student.pending > 0);
    return matchesQuery && matchesStatus;
  }), [query, status]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Estudiantes</h1>
          <p style={styles.subtitle}>Listado y avance de estudiantes vinculados</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <div>
            <h2 style={styles.sectionTitle}>Estudiantes</h2>
            <p style={styles.sectionSubtitle}>Seguimiento individual de las prácticas vinculadas</p>
          </div>
          <div style={styles.actions}>
            <input
              type="search"
              placeholder="Buscar estudiante..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={styles.searchInput}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.select}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        {filteredStudents.length ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Estudiante</th>
                  <th style={styles.th}>Centro</th>
                  <th style={styles.th}>Avance</th>
                  <th style={styles.th}>Horas</th>
                  <th style={styles.th}>Pendientes</th>
                  <th style={styles.th}>Documentos</th>
                  <th style={styles.th} />
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const progress = Math.min((student.hours / 360) * 100, 100);
                  return (
                    <tr key={student.id}>
                      <td style={styles.td}>
                        <div style={styles.studentCell}>
                          <span style={styles.avatar}>{student.initials}</span>
                          <div style={styles.studentInfo}>
                            <strong>{student.name}</strong>
                            <small style={styles.practiceLabel}>{student.practice}</small>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{student.center}</td>
                      <td style={styles.td}><span style={styles.progressTrack}><span style={{ ...styles.progressBar, width: `${progress}%` }} /></span></td>
                      <td style={styles.td}>{student.hours} / 360</td>
                      <td style={styles.td}><span style={student.pending ? styles.pendingBadge : styles.okBadge}>{student.pending || '0'}</span></td>
                      <td style={styles.td}><span style={student.documents === 'Al día' ? styles.okBadge : styles.documentBadge}>{student.documents}</span></td>
                      <td style={styles.td}><button type="button" style={styles.openButton} onClick={() => navigate(`/docente/estudiantes/${student.id}`)}>Abrir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>No se encontraron estudiantes con los filtros seleccionados.</div>
        )}
      </section>
    </div>
  );
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
  title: { margin: 0, fontSize: '1.55rem', color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '.68rem', fontWeight: 700 },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '13px' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '.82rem' },
  sectionSubtitle: { margin: '5px 0 0', color: '#8391a4', fontSize: '.65rem' },
  actions: { display: 'flex', gap: '7px' },
  searchInput: { width: '150px', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontSize: '.62rem' },
  select: { width: '110px', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 7px', color: '#35465d', backgroundColor: '#fff', fontSize: '.6rem' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '.62rem' },
  th: { padding: '9px 8px', backgroundColor: '#f5f8fb', color: '#74859b', textAlign: 'left', fontSize: '.54rem', textTransform: 'uppercase' },
  td: { padding: '10px 8px', borderBottom: '1px solid #edf1f5', color: '#52637a', whiteSpace: 'nowrap' },
  studentCell: { display: 'flex', alignItems: 'center', gap: '8px', color: '#33445b' },
  studentInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' },
  practiceLabel: { color: '#8190a5', fontSize: '.54rem', fontWeight: 400 },
  avatar: { display: 'grid', placeItems: 'center', width: '27px', height: '27px', borderRadius: '50%', backgroundColor: '#e5eef9', color: '#3972c4', fontSize: '.53rem', fontWeight: 700 },
  progressTrack: { display: 'inline-block', width: '105px', height: '7px', backgroundColor: '#e7edf4', borderRadius: '8px', overflow: 'hidden', verticalAlign: 'middle' },
  progressBar: { display: 'block', height: '100%', backgroundColor: '#28b6a6' },
  pendingBadge: { display: 'inline-block', minWidth: '17px', borderRadius: '12px', padding: '4px 6px', backgroundColor: '#fff1c9', color: '#9a6b00', textAlign: 'center', fontSize: '.53rem', fontWeight: 700 },
  documentBadge: { display: 'inline-block', borderRadius: '12px', padding: '4px 7px', backgroundColor: '#e6efff', color: '#3570c7', fontSize: '.53rem', fontWeight: 700 },
  okBadge: { display: 'inline-block', borderRadius: '12px', padding: '4px 7px', backgroundColor: '#dff6ed', color: '#138a68', fontSize: '.53rem', fontWeight: 700 },
  openButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#fff', color: '#35465d', fontSize: '.58rem', fontWeight: 700, cursor: 'pointer' },
  emptyState: { padding: '35px', textAlign: 'center', color: '#8190a5', fontSize: '.7rem' },
};

export default ListadoEstudiantesDocente;
