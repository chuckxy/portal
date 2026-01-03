'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import TimetablePrintReport from './TimetablePrintReport';

type PrintOrientation = 'landscape' | 'portrait';

interface TimetableData {
    _id?: string;
    school: any;
    site: any;
    class?: any;
    department?: any;
    academicYear: string;
    academicTerm: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    schedule: any[];
    recessActivities: any[];
    version: number;
    isActive: boolean;
    createdBy?: any;
    versionNote?: string;
}

interface TimetablePrintDialogProps {
    visible: boolean;
    onHide: () => void;
    timetable: TimetableData | null;
    schoolLogo?: string;
}

export const TimetablePrintDialog: React.FC<TimetablePrintDialogProps> = ({ visible, onHide, timetable, schoolLogo }) => {
    const printRef = useRef<HTMLDivElement>(null);

    // Print options state
    const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
    const [showLegend, setShowLegend] = useState(true);
    const [customTitle, setCustomTitle] = useState('');
    const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'Approved' | 'Pending'>('Draft');

    const orientationOptions = [
        { label: 'Landscape', value: 'landscape', icon: 'pi pi-arrows-h' },
        { label: 'Portrait', value: 'portrait', icon: 'pi pi-arrows-v' }
    ];

    const approvalOptions = [
        { label: 'Draft', value: 'Draft' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' }
    ];

    // Dynamic print styles based on orientation
    const getPageStyle = useCallback(() => {
        return `
            @page {
                size: A3 ${orientation};
                margin: 10mm;
            }
            @media print {
                html, body {
                    width: ${orientation === 'landscape' ? '420mm' : '297mm'};
                    height: ${orientation === 'landscape' ? '297mm' : '420mm'};
                }
                .timetable-print-report {
                    width: 100% !important;
                    min-height: auto !important;
                }
            }
        `;
    }, [orientation]);

    // react-to-print hook
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Timetable-${timetable?.class?.className || timetable?.department?.name || 'Schedule'}-${timetable?.academicYear}`,
        pageStyle: getPageStyle(),
        onBeforePrint: () => {
            console.log('Preparing to print...');
            return Promise.resolve();
        },
        onAfterPrint: () => {
            console.log('Print completed');
        }
    });

    const orientationTemplate = (option: any) => {
        return (
            <div className="flex align-items-center gap-2">
                <i className={option.icon}></i>
                <span>{option.label}</span>
            </div>
        );
    };

    const dialogFooter = (
        <div className="flex justify-content-between align-items-center">
            <div className="flex align-items-center gap-2 text-500 text-sm">
                <i className="pi pi-info-circle"></i>
                <span>A3 paper size ({orientation === 'landscape' ? '420×297mm' : '297×420mm'})</span>
            </div>
            <div className="flex gap-2">
                <Button label="Cancel" icon="pi pi-times" outlined onClick={onHide} />
                <Button label="Print Timetable" icon="pi pi-print" onClick={() => handlePrint()} disabled={!timetable} />
            </div>
        </div>
    );

    if (!timetable) return null;

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-print text-primary" style={{ fontSize: '1.5rem' }}></i>
                    <span>Print Timetable</span>
                </div>
            }
            footer={dialogFooter}
            style={{ width: '90vw', maxWidth: '1400px' }}
            maximizable
            modal
            className="timetable-print-dialog"
        >
            <style jsx global>{`
                .timetable-print-dialog .p-dialog-content {
                    padding: 0 !important;
                }

                .print-options-panel {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .print-preview-container {
                    padding: 1.5rem;
                    background: #e5e7eb;
                    max-height: 60vh;
                    overflow: auto;
                }

                .print-preview-wrapper {
                    background: white;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
                    margin: 0 auto;
                    transform-origin: top center;
                }

                .print-preview-wrapper[data-orientation='landscape'] {
                    width: 840px;
                    transform: scale(0.5);
                    margin-bottom: -297px;
                }

                .print-preview-wrapper[data-orientation='portrait'] {
                    width: 594px;
                    transform: scale(0.5);
                    margin-bottom: -420px;
                }

                .option-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .option-label {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.875rem;
                }

                .option-description {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                @media print {
                    .print-options-panel,
                    .p-dialog-header,
                    .p-dialog-footer {
                        display: none !important;
                    }

                    .print-preview-wrapper {
                        transform: none !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>

            {/* Print Options Panel */}
            <div className="print-options-panel">
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <div className="option-group">
                            <label className="option-label">
                                <i className="pi pi-arrows-alt mr-2"></i>
                                Orientation
                            </label>
                            <SelectButton value={orientation} options={orientationOptions} onChange={(e) => setOrientation(e.value)} itemTemplate={orientationTemplate} className="w-full" />
                            <span className="option-description">{orientation === 'landscape' ? 'Better for timetables with many time slots' : 'Better for timetables with many days'}</span>
                        </div>
                    </div>

                    <div className="col-12 md:col-4">
                        <div className="option-group">
                            <label className="option-label">
                                <i className="pi pi-check-circle mr-2"></i>
                                Approval Status
                            </label>
                            <SelectButton value={approvalStatus} options={approvalOptions} onChange={(e) => setApprovalStatus(e.value)} className="w-full" />
                            <span className="option-description">Status displayed on printed document</span>
                        </div>
                    </div>

                    <div className="col-12 md:col-4">
                        <div className="option-group">
                            <label className="option-label">
                                <i className="pi pi-pencil mr-2"></i>
                                Custom Title (Optional)
                            </label>
                            <InputText value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g., Grade 6A Timetable" className="w-full" />
                            <span className="option-description">Leave empty to use default title</span>
                        </div>
                    </div>

                    <div className="col-12">
                        <Divider className="my-2" />
                        <div className="flex align-items-center gap-4">
                            <div className="flex align-items-center gap-2">
                                <Checkbox inputId="showLegend" checked={showLegend} onChange={(e) => setShowLegend(e.checked || false)} />
                                <label htmlFor="showLegend" className="cursor-pointer text-sm">
                                    Show Subject Legend
                                </label>
                            </div>

                            <Message severity="info" text={`Paper: A3 ${orientation.charAt(0).toUpperCase() + orientation.slice(1)} (${orientation === 'landscape' ? '420×297' : '297×420'}mm)`} className="py-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Preview */}
            <div className="print-preview-container">
                <div className="text-center mb-3">
                    <span className="text-sm text-600">
                        <i className="pi pi-eye mr-2"></i>
                        Print Preview (50% scale)
                    </span>
                </div>

                <div className="print-preview-wrapper" data-orientation={orientation}>
                    <TimetablePrintReport ref={printRef} timetable={timetable} orientation={orientation} schoolLogo={schoolLogo} showLegend={showLegend} customTitle={customTitle || undefined} approvalStatus={approvalStatus} />
                </div>
            </div>
        </Dialog>
    );
};

export default TimetablePrintDialog;
