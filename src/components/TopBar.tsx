import React, { useState, useEffect } from 'react';
import { Menu, Info, Edit, Clock } from 'lucide-react';
import type { ExamData } from '../firebaseUtils';

interface TopBarProps {
    currentPage: string;
    examData: ExamData | null;
    onNavigate: (page: string) => void;
    onEditExam: () => void;
    onShowInfo: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
    currentPage,
    examData,
    onNavigate,
    onEditExam,
    onShowInfo
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getTitle = () => {
        switch (currentPage) {
            case 'welcome':
                return 'ברוכים הבאים';
            case 'newExamForm':
                return 'בדיקה חדשה';
            case 'exam':
                return `בדיקה - ${examData?.patientName || 'לא ידוע'}`;
            default:
                return 'ReFeel';
        }
    };

    return (
        <div className="bg-white shadow-md h-16 flex items-center justify-between px-4 sticky top-0 z-40" dir="rtl">
            {/* Right Side: Menu & Logo */}
            <div className="flex items-center gap-4">
                {currentPage === 'exam' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <Menu size={24} className="text-gray-700" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute top-12 right-0 bg-white shadow-lg rounded-lg py-2 w-48 border z-50">
                                <button
                                    onClick={() => {
                                        onShowInfo();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Info size={18} />
                                    <span>מידע ופרוטוקול</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onEditExam();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Edit size={18} />
                                    <span>ערוך פרטי בדיקה</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <img
                    src="/text_only-removebg.png"
                    alt="ReFeel"
                    className="h-8 object-contain"
                />
            </div>

            {/* Center: Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
                <h1 className="text-xl font-bold text-gray-800">{getTitle()}</h1>
            </div>

            {/* Left Side: Clock & Finish Button */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                    <Clock size={16} />
                    <span>
                        {currentTime.toLocaleDateString('he-IL')} | {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {currentPage === 'exam' && (
                    <button
                        onClick={() => onNavigate('welcome')}
                        className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm hover:bg-red-600 transition shadow-sm"
                    >
                        סיים בדיקה
                    </button>
                )}
            </div>
        </div>
    );
};

export default TopBar;
