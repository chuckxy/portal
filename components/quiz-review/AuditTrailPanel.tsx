'use client';

import React, { useState, useMemo } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Timeline } from 'primereact/timeline';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Chip } from 'primereact/chip';
import { Divider } from 'primereact/divider';
import { Badge } from 'primereact/badge';

import { AuditTrailPanelProps, AuditTrailEntry, AuditActionType, auditActionConfig } from '@/lib/lms/quiz-review-types';

/**
 * AuditTrailPanel - Displays complete audit history for the attempt
 *
 * Features:
 * - Immutable, append-only audit log display
 * - Filter by action type, date range, user
 * - Timeline and table view modes
 * - Detailed view for each audit entry
 * - Export capability
 */
const AuditTrailPanel: React.FC<AuditTrailPanelProps> = ({ auditEntries, viewConfig }) => {
    const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
    const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
    const [detailDialogVisible, setDetailDialogVisible] = useState(false);

    // Filters
    const [actionFilter, setActionFilter] = useState<AuditActionType | null>(null);
    const [dateRange, setDateRange] = useState<Date[] | null>(null);
    const [userFilter, setUserFilter] = useState<string | null>(null);

    // Get unique users from audit entries
    const uniqueUsers = useMemo(() => {
        const users = new Map<string, { id: string; name: string }>();
        auditEntries.forEach((entry) => {
            if (!users.has(entry.performedBy._id)) {
                users.set(entry.performedBy._id, {
                    id: entry.performedBy._id,
                    name: `${entry.performedBy.firstName} ${entry.performedBy.lastName}`
                });
            }
        });
        return Array.from(users.values());
    }, [auditEntries]);

    // Action type filter options
    const actionOptions = Object.entries(auditActionConfig).map(([value, config]) => ({
        value,
        label: config.label,
        icon: config.icon
    }));

    // Filtered entries
    const filteredEntries = useMemo(() => {
        let filtered = [...auditEntries];

        if (actionFilter) {
            filtered = filtered.filter((e) => e.actionType === actionFilter);
        }

        if (dateRange && dateRange[0]) {
            const startDate = new Date(dateRange[0]);
            startDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((e) => new Date(e.timestamp) >= startDate);
        }

        if (dateRange && dateRange[1]) {
            const endDate = new Date(dateRange[1]);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((e) => new Date(e.timestamp) <= endDate);
        }

        if (userFilter) {
            filtered = filtered.filter((e) => e.performedBy._id === userFilter);
        }

        // Sort by timestamp descending (newest first)
        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditEntries, actionFilter, dateRange, userFilter]);

    // Clear all filters
    const clearFilters = () => {
        setActionFilter(null);
        setDateRange(null);
        setUserFilter(null);
    };

    // Open detail dialog
    const openDetailDialog = (entry: AuditTrailEntry) => {
        setSelectedEntry(entry);
        setDetailDialogVisible(true);
    };

    // Format timestamp
    const formatTimestamp = (timestamp: Date | string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Timeline event template
    const timelineEventTemplate = (entry: AuditTrailEntry) => {
        const config = auditActionConfig[entry.actionType];

        return (
            <Card className="mb-3 cursor-pointer hover:shadow-3 transition-all transition-duration-200" onClick={() => openDetailDialog(entry)}>
                <div className="flex flex-column md:flex-row justify-content-between gap-3">
                    <div className="flex-1">
                        <div className="flex align-items-center gap-2 mb-2">
                            <Tag value={config.label} severity={config.severity} icon={config.icon} />
                            <span className="text-500 text-sm">{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        <p className="m-0 text-900 line-height-3">{entry.description}</p>
                        {entry.questionNumber && <Chip label={`Question ${entry.questionNumber}`} className="mt-2" icon="pi pi-question-circle" />}
                    </div>
                    <div className="text-right">
                        <div className="flex align-items-center gap-2 justify-content-end">
                            <i className="pi pi-user text-500"></i>
                            <span className="font-medium">
                                {entry.performedBy.firstName} {entry.performedBy.lastName}
                            </span>
                        </div>
                        <small className="text-500">{entry.performedBy.role}</small>
                    </div>
                </div>

                {/* Show changes summary if available */}
                {(entry.previousValue !== undefined || entry.newValue !== undefined) && (
                    <div className="mt-3 p-2 surface-100 border-round text-sm">
                        <div className="flex gap-4">
                            {entry.previousValue !== undefined && (
                                <div>
                                    <span className="text-500">Previous: </span>
                                    <span className="text-red-600 font-mono">{typeof entry.previousValue === 'object' ? JSON.stringify(entry.previousValue) : String(entry.previousValue)}</span>
                                </div>
                            )}
                            {entry.newValue !== undefined && (
                                <div>
                                    <span className="text-500">New: </span>
                                    <span className="text-green-600 font-mono">{typeof entry.newValue === 'object' ? JSON.stringify(entry.newValue) : String(entry.newValue)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        );
    };

    // Timeline marker template
    const timelineMarkerTemplate = (entry: AuditTrailEntry) => {
        const config = auditActionConfig[entry.actionType];
        const severityColors: Record<string, string> = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-orange-500',
            danger: 'bg-red-500'
        };

        return (
            <span className={`flex align-items-center justify-content-center border-circle ${severityColors[config.severity] || 'bg-primary'}`} style={{ width: '2rem', height: '2rem' }}>
                <i className={`${config.icon} text-white text-sm`}></i>
            </span>
        );
    };

    // Table view templates
    const actionBodyTemplate = (entry: AuditTrailEntry) => {
        const config = auditActionConfig[entry.actionType];
        return <Tag value={config.label} severity={config.severity} icon={config.icon} />;
    };

    const userBodyTemplate = (entry: AuditTrailEntry) => (
        <div>
            <div className="font-medium">
                {entry.performedBy.firstName} {entry.performedBy.lastName}
            </div>
            <small className="text-500">{entry.performedBy.role}</small>
        </div>
    );

    const timestampBodyTemplate = (entry: AuditTrailEntry) => (
        <div>
            <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
            <small className="text-500">{new Date(entry.timestamp).toLocaleTimeString()}</small>
        </div>
    );

    const detailsBodyTemplate = (entry: AuditTrailEntry) => <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-sm" onClick={() => openDetailDialog(entry)} tooltip="View Details" />;

    // Export audit log
    const exportAuditLog = () => {
        const exportData = filteredEntries.map((entry) => ({
            timestamp: formatTimestamp(entry.timestamp),
            action: auditActionConfig[entry.actionType].label,
            description: entry.description,
            performedBy: `${entry.performedBy.firstName} ${entry.performedBy.lastName}`,
            role: entry.performedBy.role,
            questionNumber: entry.questionNumber || '',
            previousValue: entry.previousValue ? JSON.stringify(entry.previousValue) : '',
            newValue: entry.newValue ? JSON.stringify(entry.newValue) : '',
            justification: entry.justification || ''
        }));

        const csvContent = [
            Object.keys(exportData[0] || {}).join(','),
            ...exportData.map((row) =>
                Object.values(row)
                    .map((v) => `"${v}"`)
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="audit-trail-panel">
            {/* Header */}
            <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3 mb-4">
                <div>
                    <h3 className="m-0 mb-1 text-900">
                        <i className="pi pi-history mr-2"></i>
                        Audit Trail
                    </h3>
                    <p className="m-0 text-500">Complete history of all actions taken on this attempt</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        icon={viewMode === 'timeline' ? 'pi pi-list' : 'pi pi-clock'}
                        label={viewMode === 'timeline' ? 'Table View' : 'Timeline View'}
                        className="p-button-outlined p-button-sm"
                        onClick={() => setViewMode(viewMode === 'timeline' ? 'table' : 'timeline')}
                    />
                    <Button icon="pi pi-download" label="Export" className="p-button-outlined p-button-sm" onClick={exportAuditLog} />
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-4">
                <div className="flex flex-wrap gap-3 align-items-end">
                    <div className="flex flex-column gap-1">
                        <label className="text-sm text-600">Action Type</label>
                        <Dropdown value={actionFilter} options={actionOptions} onChange={(e) => setActionFilter(e.value)} placeholder="All Actions" className="w-12rem" showClear />
                    </div>
                    <div className="flex flex-column gap-1">
                        <label className="text-sm text-600">Date Range</label>
                        <Calendar value={dateRange} onChange={(e) => setDateRange(e.value as Date[])} selectionMode="range" readOnlyInput placeholder="Select range" className="w-14rem" showButtonBar />
                    </div>
                    <div className="flex flex-column gap-1">
                        <label className="text-sm text-600">Performed By</label>
                        <Dropdown value={userFilter} options={uniqueUsers} optionLabel="name" optionValue="id" onChange={(e) => setUserFilter(e.value)} placeholder="All Users" className="w-12rem" showClear />
                    </div>
                    <Button icon="pi pi-filter-slash" label="Clear Filters" className="p-button-text p-button-sm" onClick={clearFilters} disabled={!actionFilter && !dateRange && !userFilter} />
                    <div className="ml-auto">
                        <Badge value={`${filteredEntries.length} entries`} severity="info" />
                    </div>
                </div>
            </Card>

            {/* Empty State */}
            {filteredEntries.length === 0 && (
                <Card className="text-center p-5">
                    <i className="pi pi-history text-6xl text-300 mb-3"></i>
                    <h4 className="text-700 m-0 mb-2">No Audit Entries</h4>
                    <p className="text-500 m-0">{actionFilter || dateRange || userFilter ? 'No entries match the current filters' : 'No audit history recorded for this attempt yet'}</p>
                </Card>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && filteredEntries.length > 0 && <Timeline value={filteredEntries} content={timelineEventTemplate} marker={timelineMarkerTemplate} className="customized-timeline" />}

            {/* Table View */}
            {viewMode === 'table' && filteredEntries.length > 0 && (
                <DataTable value={filteredEntries} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} responsiveLayout="scroll" stripedRows className="p-datatable-sm">
                    <Column header="Timestamp" body={timestampBodyTemplate} sortable sortField="timestamp" style={{ width: '150px' }} />
                    <Column header="Action" body={actionBodyTemplate} style={{ width: '150px' }} />
                    <Column field="description" header="Description" />
                    <Column header="Question" field="questionNumber" body={(e) => (e.questionNumber ? `Q${e.questionNumber}` : '-')} style={{ width: '100px' }} />
                    <Column header="Performed By" body={userBodyTemplate} style={{ width: '180px' }} />
                    <Column header="" body={detailsBodyTemplate} style={{ width: '60px' }} />
                </DataTable>
            )}

            {/* Detail Dialog */}
            <Dialog visible={detailDialogVisible} onHide={() => setDetailDialogVisible(false)} header="Audit Entry Details" style={{ width: '600px' }} modal>
                {selectedEntry && (
                    <div>
                        {/* Action Info */}
                        <div className="flex align-items-center gap-3 mb-4">
                            <Tag value={auditActionConfig[selectedEntry.actionType].label} severity={auditActionConfig[selectedEntry.actionType].severity} icon={auditActionConfig[selectedEntry.actionType].icon} className="text-lg" />
                            <span className="text-500">{formatTimestamp(selectedEntry.timestamp)}</span>
                        </div>

                        <Divider />

                        {/* Description */}
                        <div className="mb-4">
                            <h5 className="m-0 mb-2 text-700">Description</h5>
                            <p className="m-0 text-900 line-height-3">{selectedEntry.description}</p>
                        </div>

                        {/* Performed By */}
                        <div className="mb-4">
                            <h5 className="m-0 mb-2 text-700">Performed By</h5>
                            <div className="surface-100 p-3 border-round">
                                <div className="flex align-items-center gap-3">
                                    <div className="flex align-items-center justify-content-center bg-primary border-circle" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="text-white font-bold">
                                            {selectedEntry.performedBy.firstName[0]}
                                            {selectedEntry.performedBy.lastName[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-900">
                                            {selectedEntry.performedBy.firstName} {selectedEntry.performedBy.lastName}
                                        </div>
                                        <div className="text-500">{selectedEntry.performedBy.role}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Question Reference */}
                        {selectedEntry.questionNumber && (
                            <div className="mb-4">
                                <h5 className="m-0 mb-2 text-700">Related Question</h5>
                                <Chip label={`Question ${selectedEntry.questionNumber}`} icon="pi pi-question-circle" />
                            </div>
                        )}

                        {/* Value Changes */}
                        {(selectedEntry.previousValue !== undefined || selectedEntry.newValue !== undefined) && (
                            <div className="mb-4">
                                <h5 className="m-0 mb-2 text-700">Value Changes</h5>
                                <div className="grid">
                                    {selectedEntry.previousValue !== undefined && (
                                        <div className="col-6">
                                            <div className="p-3 border-round border-1 border-red-300 bg-red-50">
                                                <div className="text-sm text-red-700 mb-1">Previous Value</div>
                                                <code className="text-red-800 text-sm">{typeof selectedEntry.previousValue === 'object' ? JSON.stringify(selectedEntry.previousValue, null, 2) : String(selectedEntry.previousValue)}</code>
                                            </div>
                                        </div>
                                    )}
                                    {selectedEntry.newValue !== undefined && (
                                        <div className="col-6">
                                            <div className="p-3 border-round border-1 border-green-300 bg-green-50">
                                                <div className="text-sm text-green-700 mb-1">New Value</div>
                                                <code className="text-green-800 text-sm">{typeof selectedEntry.newValue === 'object' ? JSON.stringify(selectedEntry.newValue, null, 2) : String(selectedEntry.newValue)}</code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Justification */}
                        {selectedEntry.justification && (
                            <div className="mb-4">
                                <h5 className="m-0 mb-2 text-700">Justification</h5>
                                <div className="p-3 surface-100 border-round border-left-3 border-blue-500">
                                    <p className="m-0 text-700 line-height-3 font-italic">&ldquo;{selectedEntry.justification}&rdquo;</p>
                                </div>
                            </div>
                        )}

                        {/* IP Address */}
                        {selectedEntry.ipAddress && (
                            <div>
                                <h5 className="m-0 mb-2 text-700">IP Address</h5>
                                <code className="text-500">{selectedEntry.ipAddress}</code>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>

            {/* Custom Timeline Styles */}
            <style jsx>{`
                :global(.customized-timeline .p-timeline-event-opposite) {
                    display: none;
                }
                :global(.customized-timeline .p-timeline-event-content) {
                    line-height: 1;
                }
            `}</style>
        </div>
    );
};

export default AuditTrailPanel;
