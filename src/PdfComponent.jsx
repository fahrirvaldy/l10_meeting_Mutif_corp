import React from 'react';
import {
  FACTOR_LABELS,
  formatDateID,
  getBranchRootCause,
  getRootCauses,
  getThemes,
  hasText,
  themeHasContent,
} from './idsModel';

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
    .map(a => parseFloat(data.ratings?.['rating_id_' + a.id]))
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
        {renderKpiTable(data?.scorecardTitles?.mcpKPI || 'Marketing Campaign Program', data?.mcpKPI)}
      </div>

      {/* Rock Review */}
      <div className="pdf-page page-break">
        <h2>Rock Review (Prioritas 90 Hari)</h2>
        {/* KUNCI PERBAIKAN: Tambahkan style pengekang batas tabel */}
        <table className="data-table fixed-layout" style={{ width: '100%', tableLayout: 'fixed', display: 'table' }}>          
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
              if (!hasText(item.rock) && !hasText(item.owner) && !hasText(item.note)) return null;
              return (
                <tr key={i} style={{ pageBreakInside: 'avoid' }}>
                  {/* KUNCI PERBAIKAN: Tambahkan wordBreak: 'break-all' dan whiteSpace: 'pre-wrap' */}
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.owner) || '-'}</td>
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.rock)}</td>
                  <td className={item.status === 'on' ? 'status-on' : 'status-off'}>
                    {item.status === 'on' ? 'ON' : 'OFF'}
                  </td>
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.note)}</td>
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
        {/* KUNCI PERBAIKAN: Tambahkan style display: 'table' dan width: '100%' secara mutlak */}
        <table className="data-table fixed-layout" style={{ width: '100%', tableLayout: 'fixed', display: 'table' }}>
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
              if (!hasText(item.text) && !hasText(item.owner)) return null;
              return (
                <tr key={i} style={{ pageBreakInside: 'avoid', textDecoration: item.isDone ? 'line-through' : 'none', opacity: item.isDone ? 0.6 : 1 }}>
                  {/* KUNCI PERBAIKAN: Tambahkan wordBreak: 'break-all' dan whiteSpace: 'pre-wrap' */}
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.text) || '-'}</td>
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.owner) || '-'}</td>
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processText(item.deadline) || '-'}</td>
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
      {getThemes(data).map((theme, idx) => {
        if (!themeHasContent(theme)) return null;

        const rootCauses = getRootCauses(theme);
        const selectedFactors = theme.anomalyFactors.filter(
          (factor) => FACTOR_LABELS[factor],
        );

        return (
          <div key={theme.id || idx} className="pdf-page page-break">
            <h2 style={{ color: '#8b5cf6', marginBottom: '8px' }}>
              Tema Diskusi {idx + 1}: {processText(theme.topic) || 'Tanpa Judul'}
            </h2>

            <div className="grid-2-col" style={{ marginBottom: '12px' }}>
              <div className="card-pdf" style={{ margin: 0, padding: '10px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#64748b' }}>
                  Kondisi Sekarang
                </h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {processText(theme.currentCond) || '-'}
                </p>
              </div>
              <div className="card-pdf" style={{ margin: 0, padding: '10px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#64748b' }}>
                  Kondisi Diinginkan
                </h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {processText(theme.desiredCond) || '-'}
                </p>
              </div>
            </div>

            <div className="card-pdf" style={{ marginBottom: '12px', padding: '12px' }}>
              <h3 style={{ marginTop: 0 }}>Fishbone 5M · Faktor Anomali</h3>
              {selectedFactors.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b' }}>Belum ada faktor abnormal yang dipilih.</p>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Faktor</th>
                      <th>Analisa Anomali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFactors.map((factor) => (
                      <tr key={factor} style={{ pageBreakInside: 'avoid' }}>
                        <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                          {FACTOR_LABELS[factor]}
                        </td>
                        <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {processText(theme.analysis?.[factor]) || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p style={{ margin: '8px 0 0 0', fontSize: '9pt', color: '#6d28d9' }}>
                Ceteris paribus: hanya faktor abnormal yang dianalisis. Semakin sedikit variabel
                yang diintervensi, semakin teruji validitas perbaikannya.
              </p>
            </div>

            <div className="card-pdf" style={{ marginBottom: '12px', padding: '12px' }}>
              <h3 style={{ marginTop: 0 }}>5-Why Multi-Cabang & Akar Masalah</h3>
              {theme.branches.map((branch, branchIndex) => {
                const rootCause = getBranchRootCause(branch);
                const isManual = hasText(branch.rootCauseOverride);

                return (
                  <div key={branch.id} className="report-branch" style={{ pageBreakInside: 'avoid' }}>
                    <div className="report-branch-title">
                      Cabang Masalah #{branchIndex + 1}
                    </div>
                    <table className="data-table pdf-why-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '8%' }}>#</th>
                          <th style={{ width: '38%' }}>Akibat / Gejala</th>
                          <th style={{ width: '12%' }}>Karena</th>
                          <th style={{ width: '42%' }}>Sebab / Pemicu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branch.whys.map((why, whyIndex) => (
                          <tr key={why.id} style={{ pageBreakInside: 'avoid' }}>
                            <td>{whyIndex + 1}</td>
                            <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {processText(why.effect) || '-'}
                            </td>
                            <td style={{ color: '#7e22ce', fontWeight: 'bold' }}>karena</td>
                            <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {processText(why.cause) || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="report-rootcause">
                      <strong>Akar Masalah #{branchIndex + 1}:</strong>{' '}
                      {processText(rootCause) || 'Belum teridentifikasi'}
                      <span className="report-tag">{isManual ? 'Manual' : 'Otomatis'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card-pdf" style={{ padding: '12px', border: '1px solid #e9d5ff', background: '#faf5ff' }}>
              <h3 style={{ marginTop: 0, color: '#7e22ce' }}>Matriks Rencana Aksi 5W+1H</h3>
              {theme.tasks.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b' }}>Belum ada task rencana aksi.</p>
              ) : (
                <table className="data-table pdf-task-table" style={{ margin: 0, background: 'white' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '17%' }}>Akar Masalah</th>
                      <th style={{ width: '16%' }}>What</th>
                      <th style={{ width: '14%' }}>Why</th>
                      <th style={{ width: '12%' }}>Who</th>
                      <th style={{ width: '12%' }}>When</th>
                      <th style={{ width: '14%' }}>Where</th>
                      <th style={{ width: '15%' }}>How</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theme.tasks.map((task) => {
                      const linkedRootCause =
                        rootCauses.find((item) => item.id === task.rootCauseId) || rootCauses[0];
                      return (
                        <tr key={task.id} style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {linkedRootCause
                              ? `${linkedRootCause.label}${
                                  linkedRootCause.text ? `: ${linkedRootCause.text}` : ''
                                }`
                              : 'Belum terhubung'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {processText(task.what) || '-'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {processText(task.why) || '-'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {processText(task.who) || '-'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {hasText(task.when) ? formatDateID(task.when) : '-'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {processText(task.where) || '-'}
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {processText(task.how) || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
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
                  .filter(a => a.checked && data.ratings?.['rating_id_' + a.id])
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
