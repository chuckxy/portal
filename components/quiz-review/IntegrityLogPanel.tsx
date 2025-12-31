'use client';

import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Timeline } from 'primereact/timeline';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';

import { IntegrityLogPanelProps, ViolationRecord, violationTypeConfig, attemptStatusConfig } from '@/lib/lms/quiz-review-types';

/**
 * IntegrityLogPanel - Displays behavior/integrity events during quiz attempt
 *
 * Shows violations neutrally without assumptions:
 * - Fullscreen exits
 * - Tab switches
 * - Focus loss events
 * - Copy/paste attempts
 * - Developer tools detection
 *
 * Only visible to instructors and administrators
 */
const IntegrityLogPanel: React.FC<IntegrityLogPanelProps> = ({ violations, ipAddress, userAgent, attemptStatus }) => {
    const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

    // Format timestamp
    const formatTime = (timestamp: string): string => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDateTime = (timestamp: string): string => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Group violations by type for summary
    const violationSummary = violations.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Get severity color class
    const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
        switch (severity) {
            case 'high':
                return 'text-red-600 bg-red-100';
            case 'medium':
                return 'text-orange-600 bg-orange-100';
            case 'low':
                return 'text-blue-600 bg-blue-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    // Timeline event template
    const timelineContent = (violation: ViolationRecord) => {
        const config = violationTypeConfig[violation.type];
        return (
            <Card className="mb-2 shadow-1">
                <div className="flex align-items-start gap-3">
                    <div className={`p-2 border-round ${getSeverityColor(config.severity)}`}>
                        <i className={`${config.icon} text-xl`}></i>
                    </div>
                    <div className="flex-grow-1">
                        <div className="flex justify-content-between align-items-start mb-2">
                            <div>
                                <h4 className="m-0 text-900 font-semibold">{config.label}</h4>
                                <p className="m-0 text-sm text-600">{config.description}</p>
                            </div>
                            <Tag value={config.severity.toUpperCase()} severity={config.severity === 'high' ? 'danger' : config.severity === 'medium' ? 'warning' : 'info'} className="text-xs" />
                        </div>
                        {violation.details && <p className="m-0 text-sm text-700 surface-100 p-2 border-round">{violation.details}</p>}
                    </div>
                </div>
            </Card>
        );
    };

    const timelineMarker = (violation: ViolationRecord) => {
        const config = violationTypeConfig[violation.type];
        return (
            <span className={`flex align-items-center justify-content-center border-circle ${getSeverityColor(config.severity)}`} style={{ width: '2rem', height: '2rem' }}>
                <i className={config.icon} style={{ fontSize: '0.9rem' }}></i>
            </span>
        );
    };

    const timelineOpposite = (violation: ViolationRecord) => <span className="text-sm text-600 font-medium">{formatTime(violation.timestamp)}</span>;

    // Table severity template
    const severityBodyTemplate = (violation: ViolationRecord) => {
        const config = violationTypeConfig[violation.type];
        return <Tag value={config.severity.toUpperCase()} severity={config.severity === 'high' ? 'danger' : config.severity === 'medium' ? 'warning' : 'info'} />;
    };

    // Table type template
    const typeBodyTemplate = (violation: ViolationRecord) => {
        const config = violationTypeConfig[violation.type];
        return (
            <div className="flex align-items-center gap-2">
                <i className={`${config.icon} text-600`}></i>
                <span>{config.label}</span>
            </div>
        );
    };

    // Parse user agent for readable display
    const parseUserAgent = (ua: string): { browser: string; os: string } => {
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';

        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iOS')) os = 'iOS';

        return { browser, os };
    };

    const parsedUA = userAgent ? parseUserAgent(userAgent) : null;

    return (
        <div className="integrity-log-panel">
            {/* Header & Summary */}
            <div className="flex flex-column lg:flex-row justify-content-between align-items-start lg:align-items-center gap-3 mb-4">
                <div>
                    <h3 className="m-0 text-xl font-semibold text-900 mb-2">
                        <i className="pi pi-shield mr-2"></i>
                        Academic Integrity Log
                    </h3>
                    <p className="m-0 text-600 text-sm">Behavioral events recorded during this quiz attempt. These events are presented neutrally for review.</p>
                </div>
                <div className="flex align-items-center gap-2">
                    <Button icon="pi pi-clock" label="Timeline" className={viewMode === 'timeline' ? '' : 'p-button-outlined'} onClick={() => setViewMode('timeline')} size="small" />
                    <Button icon="pi pi-table" label="Table" className={viewMode === 'table' ? '' : 'p-button-outlined'} onClick={() => setViewMode('table')} size="small" />
                </div>
            </div>

            {/* Neutral Notice */}
            <Message
                severity="info"
                className="w-full mb-4"
                content={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-info-circle"></i>
                        <span>These events are system-detected and may have legitimate explanations. Please consider the context before drawing conclusions.</span>
                    </div>
                }
            />

            {/* Attempt Termination Warning */}
            {attemptStatus === 'violation_terminated' && (
                <Message
                    severity="warn"
                    className="w-full mb-4"
                    content={
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-exclamation-triangle"></i>
                            <span>This attempt was automatically terminated due to integrity violations exceeding the allowed threshold.</span>
                        </div>
                    }
                />
            )}

            {/* Summary Cards */}
            {violations.length > 0 && (
                <div className="grid mb-4">
                    {/* Violation Count by Severity */}
                    <div className="col-12 lg:col-8">
                        <Card className="h-full">
                            <h4 className="m-0 mb-3 text-900 font-semibold">Event Summary</h4>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(violationSummary).map(([type, count]) => {
                                    const config = violationTypeConfig[type as keyof typeof violationTypeConfig];
                                    return (
                                        <div key={type} className={`flex align-items-center gap-2 px-3 py-2 border-round ${getSeverityColor(config.severity)}`}>
                                            <i className={config.icon}></i>
                                            <span className="font-medium">{config.label}</span>
                                            <span className="font-bold">×{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Session Info */}
                    <div className="col-12 lg:col-4">
                        <Card className="h-full">
                            <h4 className="m-0 mb-3 text-900 font-semibold">Session Info</h4>
                            <div className="text-sm">
                                {ipAddress && (
                                    <div className="flex align-items-center gap-2 mb-2">
                                        <i className="pi pi-globe text-600"></i>
                                        <span className="text-600">IP:</span>
                                        <span className="font-mono text-900">{ipAddress}</span>
                                    </div>
                                )}
                                {parsedUA && (
                                    <>
                                        <div className="flex align-items-center gap-2 mb-2">
                                            <i className="pi pi-desktop text-600"></i>
                                            <span className="text-600">Browser:</span>
                                            <span className="text-900">{parsedUA.browser}</span>
                                        </div>
                                        <div className="flex align-items-center gap-2">
                                            <i className="pi pi-server text-600"></i>
                                            <span className="text-600">OS:</span>
                                            <span className="text-900">{parsedUA.os}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            <Divider />

            {/* Event List */}
            {violations.length === 0 ? (
                <div className="text-center p-6">
                    <i className="pi pi-check-circle text-green-500 text-5xl mb-3"></i>
                    <h4 className="text-xl font-semibold text-900 m-0 mb-2">No Integrity Events Recorded</h4>
                    <p className="text-600 m-0">No behavioral flags were detected during this quiz attempt.</p>
                </div>
            ) : viewMode === 'timeline' ? (
                <Timeline value={violations} content={timelineContent} marker={timelineMarker} opposite={timelineOpposite} align="alternate" className="mt-4" />
            ) : (
                <DataTable value={violations} paginator rows={10} rowsPerPageOptions={[5, 10, 25]} stripedRows className="mt-4" emptyMessage="No events recorded" sortField="timestamp" sortOrder={-1}>
                    <Column field="timestamp" header="Time" body={(v) => formatDateTime(v.timestamp)} sortable style={{ width: '180px' }} />
                    <Column field="type" header="Event Type" body={typeBodyTemplate} sortable />
                    <Column field="severity" header="Severity" body={severityBodyTemplate} style={{ width: '120px' }} />
                    <Column field="details" header="Details" body={(v) => v.details || <span className="text-400">—</span>} />
                </DataTable>
            )}

            {/* Legend */}
            <Card className="mt-4 surface-50">
                <h5 className="m-0 mb-3 text-900 font-semibold">Severity Legend</h5>
                <div className="flex flex-wrap gap-4">
                    <div className="flex align-items-center gap-2">
                        <Tag value="HIGH" severity="danger" />
                        <span className="text-sm text-600">Actions that strongly indicate potential integrity concerns</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Tag value="MEDIUM" severity="warning" />
                        <span className="text-sm text-600">Actions that may warrant attention</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Tag value="LOW" severity="info" />
                        <span className="text-sm text-600">Minor events, often incidental</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default IntegrityLogPanel;
