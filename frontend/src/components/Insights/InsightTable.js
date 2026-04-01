import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from './InsightTable.module.css';

export default function InsightTable({ decisions = [], actionItems = [] }) {
  const [activeTab, setActiveTab] = useState('decisions');

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Meeting Intelligence Report", 14, 15);
    
    doc.setFontSize(12);
    doc.text("Decisions", 14, 25);
    doc.autoTable({
      startY: 30,
      head: [['Decision']],
      body: decisions.map(d => [d]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [74, 144, 226] }
    });
    
    let finalY = doc.lastAutoTable.finalY || 30;
    
    doc.text("Action Items", 14, finalY + 10);
    doc.autoTable({
      startY: finalY + 15,
      head: [['Assignee', 'Task', 'Deadline']],
      body: actionItems.map(a => [a.assignee || 'Unassigned', a.task, a.deadline || 'TBD']),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [155, 81, 224] }
    });

    doc.save("meeting-intelligence.pdf");
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
        <button onClick={handleExportPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Export PDF
        </button>
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
                    <td>{decision}</td>
                  </tr>
                ))
              ) : (
                actionItems.map((item, idx) => (
                  <tr key={idx}>
                    <td><span className={styles.tag}>{item.assignee || 'Unassigned'}</span></td>
                    <td>{item.task}</td>
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
