import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './InsightTable.module.css';

export default function InsightTable({ decisions = [], actionItems = [] }) {
  const [activeTab, setActiveTab] = useState('decisions');

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.text("Meeting Intelligence Report", 14, 15);
      
      doc.setFontSize(12);
      doc.text("Decisions", 14, 25);
      autoTable(doc, {
        startY: 30,
        head: [['Meeting', 'Decision']],
        body: decisions.map(d => typeof d === 'string' ? ['', d] : [d.meeting || '', d.decision || '']),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [74, 144, 226] }
      });
      
      let finalY = doc.lastAutoTable?.finalY || 30; // fallback if finalY isnt attached
      
      doc.text("Action Items", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Meeting', 'Assignee', 'Task', 'Deadline']],
        body: actionItems.map(a => [a.meeting || '', a.assignee || 'Unassigned', a.task || '', a.deadline || 'TBD']),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [155, 81, 224] }
      });

      doc.save("meeting-intelligence.pdf");
    } catch (e) {
      console.error("PDF Export error:", e);
    }
  };

  const handleExportCSV = () => {
    let csvRows = [];
    if (activeTab === 'decisions') {
      csvRows.push("Meeting,Decision");
      decisions.forEach(d => {
        if (typeof d === 'string') {
          csvRows.push(`"","${d.replace(/"/g, '""')}"`);
        } else {
          csvRows.push(`"${(d.meeting || '').replace(/"/g, '""')}","${(d.decision || '').replace(/"/g, '""')}"`);
        }
      });
    } else {
      csvRows.push("Meeting,Assignee,Task,Deadline");
      actionItems.forEach(a => {
        const meeting = (a.meeting || '').replace(/"/g, '""');
        const assignee = (a.assignee || 'Unassigned').replace(/"/g, '""');
        const task = (a.task || '').replace(/"/g, '""');
        const deadline = (a.deadline || 'TBD').replace(/"/g, '""');
        csvRows.push(`"${meeting}","${assignee}","${task}","${deadline}"`);
      });
    }
    
    const blob = new Blob([csvRows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `meeting_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentData = activeTab === 'decisions' ? decisions : actionItems;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'decisions' ? styles.active : ''}`}
            onClick={() => setActiveTab('decisions')}
          >
            Decisions ({decisions.length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'actionItems' ? styles.active : ''}`}
            onClick={() => setActiveTab('actionItems')}
          >
            Action Items ({actionItems.length})
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Export CSV
          </button>
          <button onClick={handleExportPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {currentData.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={48} />
            <p>No {activeTab === 'decisions' ? 'decisions' : 'action items'} found.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {activeTab === 'decisions' ? (
                  <th>Key Decisions</th>
                ) : (
                  <>
                    <th>Assignee</th>
                    <th>Task</th>
                    <th>Deadline</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'decisions' ? (
                decisions.map((decision, idx) => (
                  <tr key={idx}>
                    <td>
                      {typeof decision === 'string' ? decision : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                           <span className={styles.meetingTag}>{decision.meeting}</span>
                           <span>{decision.decision}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                actionItems.map((item, idx) => (
                  <tr key={idx}>
                    <td><span className={styles.tag}>{item.assignee || 'Unassigned'}</span></td>
                    <td>
                      {item.meeting && <div className={styles.meetingTag} style={{marginBottom: '4px'}}>{item.meeting}</div>}
                      <div>{item.task}</div>
                    </td>
                    <td className={styles.deadline}>{item.deadline || 'TBD'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
