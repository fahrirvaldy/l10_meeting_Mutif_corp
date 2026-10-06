import React from 'react';

// Helper function to process and clean text content
const processText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
};

// Helper function to render KPI tables
const renderKpiTable = (title, kpiData) => (
  <div className='print:break-inside-avoid' style={{ breakInside: 'avoid', pageBreakInside: 'avoid', display: 'block', marginBottom: '2rem' }}>
    <h3>{title}</h3>
    <table className="data-table fixed-layout">
      <thead>
        <tr>
          <th style={{ width: '30%' }}>KPI</th>
          <th style={{ width: '20%' }}>Target</th>
          <th style={{ width: '20%' }}>Realisasi</th>
          <th style={{ width: '12%' }}>Jenis</th>
          <th style={{ width: '12%' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {(kpiData || []).map((item, index) => {
          if (!item.kpi) return null;
          return (
            <tr key={index} style={{ pageBreakInside: 'avoid' }}>
              <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{processText(item.kpi)}</td>
              <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{processText(item.target)}</td>
              <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{processText(item.real)}</td>
              <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{processText(item.jenis)}</td>
              <td className={item.status === 'on' ? 'status-on' : 'status-off'}>
                {item.status === 'on' ? 'ON' : 'OFF'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PdfComponent = React.forwardRef(({ data }, ref) => {
  if (!data) return <div ref={ref}>Loading...</div>;

  // Calculate average rating
  const relevantRatings = (data?.attendances || [])
    .map(a => parseFloat(data.ratings['rating_id_' + a.id]))
    .filter(v => !isNaN(v) && v > 0);
  const averageRaw = relevantRatings.length
    ? (relevantRatings.reduce((a, b) => a + b, 0) / relevantRatings.length)
    : 0;
  const averageRating = parseFloat(averageRaw.toFixed(1));

  return (
    <div ref={ref} className="pdf-container">
      {/* Slide 0: Title Page */}
      <div className="pdf-page">
        <div className="title-page-content">
          <div className="title-date-label">Tanggal Rapat</div>
          <div className="title-date">{data.meetingDate}</div>
        </div>
      </div>

      {/* Slide 1: Initial Segment */}
      <div className="pdf-page page-break">
        <h2>Segmen Awal: Kehadiran & Kabar Baik</h2>
        <div className="grid-2-col">
          <div className="card-pdf">
            <h3>Daftar Hadir</h3>
            <ul>
              {(data?.attendances || []).map(item => (
                <li key={item.id} className={item.checked ? 'present' : 'absent'}>
                  <span className="checkbox-pdf">{item.checked ? '✓' : '✗'}</span> {item.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-pdf">
            <h3>Good News (Kabar Syukur)</h3>
            <p><strong>Owner:</strong> {data?.goodNews?.owner}</p>
            <p><strong>Integrator:</strong> {data?.goodNews?.integrator}</p>
            <p><strong>Perwakilan Tim:</strong> {data?.goodNews?.team}</p>
          </div>
        </div>
      </div>
      
      {/* KPI Slides */}
      <div className='w-full h-auto bg-white print:bg-transparent'>
        <h2>Scorecard Review</h2>
        {renderKpiTable(data?.scorecardTitles?.dmlKPI || 'Digital Marketing Lead', data?.dmlKPI)}
        {renderKpiTable(data?.scorecardTitles?.smKPI || 'Social Media', data?.smKPI)}
        {renderKpiTable(data?.scorecardTitles?.msKPI || 'Marketplace Specialist', data?.msKPI)}
        {renderKpiTable(data?.scorecardTitles?.khlKPI || 'Koordinator Host Live', data?.khlKPI)}
        {renderKpiTable(data?.scorecardTitles?.pmKPI || 'Performance Marketing', data?.pmKPI)}
        {renderKpiTable(data?.scorecardTitles?.asKPI || 'Affiliate Specialist', data?.asKPI)}
        {renderKpiTable(data?.scorecardTitles?.mcpKPI  || 'Marketing Campaign Program', data?.mcpKPI)}
      </div>

      {/* Rock Review */}
      <div className="pdf-page page-break">
        <h2>Rock Review (Prioritas 90 Hari)</h2>
        <table className="data-table fixed-layout">
          <thead>
            <tr>
              <th style={{ width: '20%' }}>Owner</th>
              <th style={{ width: '40%' }}>Rock</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '25%' }}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rockReview || []).map((item, i) => {
              if (!item.rock || !item.owner) return null;
              return (
                <tr key={i} style={{ pageBreakInside: 'avoid' }}>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.owner)}</td>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.rock)}</td>
                  <td className={item.status === 'on' ? 'status-on' : 'status-off'}>
                    {item.status === 'on' ? 'ON' : 'OFF'}
                  </td>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.note)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Headlines */}
      <div className="pdf-page page-break">
        <h2>Headlines (Customer & Internal)</h2>
        <div className="grid-2-col">
          <div className="card-pdf">
            <h3>Customer Headlines</h3>
            <ol>{(data?.headlines?.customer || []).map((hl, i) => <li key={i}>{processText(hl)}</li>)}</ol>
          </div>
          <div className="card-pdf">
            <h3>Internal Headlines</h3>
            <ol>{(data?.headlines?.internal || []).map((hl, i) => <li key={i}>{processText(hl)}</li>)}</ol>
          </div>
        </div>
      </div>

      {/* To-Do List (UPDATED DENGAN DEADLINE) */}
      <div className="pdf-page page-break">
        <h2>To-Do List (Action Plan)</h2>
        <table className="data-table fixed-layout">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Tugas</th>
              <th style={{ width: '25%' }}>Owner</th>
              <th style={{ width: '15%' }}>Deadline</th>
              <th style={{ width: '15%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.todoList || []).map((item, i) => {
              if (!item.text || !item.owner) return null;
              return (
                <tr key={i} style={{ pageBreakInside: 'avoid', textDecoration: item.isDone ? 'line-through' : 'none', opacity: item.isDone ? 0.6 : 1 }}>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.text)}</td>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.owner)}</td>
                  <td style={{ wordWrap: 'break-word' }}>{processText(item.deadline)}</td>
                  <td>{item.isDone ? 'Selesai' : 'Belum'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* IDS Session: Identify & Solve */}
      <div className="pdf-page page-break">
        <h2>IDS Session: Identify & Solve</h2>
        <div className="grid-2-col">
            <div className="card-pdf" style={{ pageBreakInside: 'avoid' }}>
              <h3>1. Issues List (Identify)</h3>
              <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                {(data?.idsSession?.issues || [])
                  .map((issue, i) => (
                    <li key={i} style={{ 
                      pageBreakInside: 'avoid', 
                      marginBottom: '8px',
                      textDecoration: issue.isResolved ? 'line-through' : 'none',
                      opacity: issue.isResolved ? 0.6 : 1
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', marginRight: '8px', border: '1px solid #e2e8f0' }}>
                        {issue.source}
                      </span>
                      {processText(issue.text)}
                    </li>
                  ))
                }
              </ul>
            </div>
            <div className="card-pdf" style={{ pageBreakInside: 'avoid' }}>
              <h3>3. Solusi Final (Solve)</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{data?.idsSession?.solutions || '-'}</p>
            </div>
        </div>
      </div>

{/* IDS Session: Discuss (THEMES MATRIX) */}
      {/* PERBAIKAN: Gunakan Object.values() untuk mencegah error jika Firebase merubah Array menjadi Object */}
      {Object.values(data?.idsSession?.themes || {}).map((theme, idx) => {
        if (!theme || !processText(theme.topic)) return null; // Sembunyikan tema jika topiknya kosong

        return (
          <div key={idx} className="pdf-page page-break" style={{ pageBreakInside: 'avoid' }}>
            <h2 style={{ color: '#8b5cf6', marginBottom: '8px' }}>Tema Diskusi {idx + 1}: {processText(theme.topic)}</h2>
            
            <div className="grid-2-col" style={{ marginBottom: '16px' }}>
              <div className="card-pdf" style={{ margin: 0, padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>Kondisi Sekarang</h4>
                <p style={{ margin: 0 }}>{processText(theme.currentCond) || '-'}</p>
              </div>
              <div className="card-pdf" style={{ margin: 0, padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>Kondisi Diinginkan</h4>
                <p style={{ margin: 0 }}>{processText(theme.desiredCond) || '-'}</p>
              </div>
            </div>

            <div className="card-pdf" style={{ marginBottom: '16px', padding: '16px' }}>
              <h3 style={{ marginTop: 0 }}>Fishbone 5M Analysis</h3>
              <table className="data-table" style={{ margin: 0 }}>
                <tbody>
                  <tr><td style={{ width: '20%', fontWeight: 'bold', background: '#f8fafc' }}>Man</td><td>{processText(theme.analysis?.man) || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', background: '#f8fafc' }}>Method</td><td>{processText(theme.analysis?.method) || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', background: '#f8fafc' }}>Machine</td><td>{processText(theme.analysis?.machine) || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', background: '#f8fafc' }}>Material</td><td>{processText(theme.analysis?.material) || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', background: '#f8fafc' }}>Environment</td><td>{processText(theme.analysis?.environment) || '-'}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card-pdf" style={{ marginBottom: '16px', padding: '16px' }}>
              <h3 style={{ marginTop: 0 }}>5-Why Analysis & Root Cause</h3>
              <ol style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                {/* PERBAIKAN: Gunakan Object.values() juga pada chain 5-Why */}
                {Object.values(theme.chain || {}).map((c, cIdx) => {
                  if(!c.effect && !c.cause) return null;
                  return (
                    <li key={cIdx} style={{ marginBottom: '4px' }}>
                      <strong>Gejala:</strong> {processText(c.effect)} <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '10px', margin: '0 8px' }}>KARENA</span> <strong>Pemicu:</strong> {processText(c.cause)}
                    </li>
                  )
                })}
              </ol>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                <strong>Akar Masalah Utama:</strong> {processText(theme.rootCause) || '-'}
              </div>
            </div>

            <div className="card-pdf" style={{ padding: '16px', border: '1px solid #e9d5ff', background: '#faf5ff' }}>
              <h3 style={{ marginTop: 0, color: '#7e22ce' }}>Action Plan (5W+1H)</h3>
              <table className="data-table" style={{ margin: 0, background: 'white' }}>
                 <tbody>
                   <tr>
                     <td style={{ width: '50%' }}><strong>What:</strong> {processText(theme.plan?.what) || '-'}</td>
                     <td style={{ width: '50%' }}><strong>Who:</strong> {processText(theme.plan?.who) || '-'}</td>
                   </tr>
                   <tr>
                     <td><strong>When:</strong> {processText(theme.plan?.when) || '-'}</td>
                     <td><strong>Where:</strong> {processText(theme.plan?.where) || '-'}</td>
                   </tr>
                   <tr>
                     <td><strong>Why:</strong> {processText(theme.plan?.why) || '-'}</td>
                     <td><strong>Cost:</strong> {processText(theme.plan?.cost) || '-'}</td>
                   </tr>
                 </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Concluding Segment */}
      <div className="pdf-page page-break">
        <h2>Segmen Akhir: Rating Rapat</h2>
        <div className="ratings-summary">
            <div className="avg-rating-container">
                <div className="avg-rating-label">Rata-Rata Rating</div>
                <div className="avg-rating-value">{averageRating}</div>
            </div>
            <div className="ratings-list">
              <h3>Detail Rating:</h3>
              <ul>
                {(data?.attendances || [])
                  .filter(a => a.checked && data.ratings['rating_id_' + a.id])
                  .map(attendee => (
                    <li key={attendee.id}>
                      <strong>{attendee.name}:</strong> {data.ratings['rating_id_' + attendee.id]}
                    </li>
                  ))}
              </ul>
            </div>
        </div>
        <p className="final-quote">
            "Rapat yang hebat dimulai dari kedisiplinan dan diakhiri dengan komitmen."
        </p>
      </div>
    </div>
  );
});

export default PdfComponent;
