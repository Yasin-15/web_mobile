"use client";
import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GradeLevel {
    id: string;
    name: string;
    grades: string[];
}

const GRADE_LEVELS: GradeLevel[] = [
    {
        id: 'elementary',
        name: 'Elementary School',
        grades: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade']
    },
    {
        id: 'middle',
        name: 'Middle School',
        grades: ['6th Grade', '7th Grade', '8th Grade']
    },
    {
        id: 'high',
        name: 'High School',
        grades: ['9th Grade', '10th Grade', '11th Grade', '12th Grade']
    }
];

export default function GradeSetupPage() {
    const [selectedLevels, setSelectedLevels] = useState<string[]>(['elementary', 'middle', 'high']);

    const toggleGradeLevel = (levelId: string) => {
        setSelectedLevels(prev => {
            if (prev.includes(levelId)) {
                return prev.filter(id => id !== levelId);
            } else {
                return [...prev, levelId];
            }
        });
    };

    const handleSave = () => {
        if (selectedLevels.length === 0) {
            toast.error('Please select at least one grade level');
            return;
        }

        // Save to localStorage or API
        localStorage.setItem('selectedGradeLevels', JSON.stringify(selectedLevels));
        toast.success('Grade levels saved successfully!');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Choose the School Grades you'll be managing
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Select the grade levels that apply to your institution. You can manage multiple levels simultaneously.
                    </p>
                </div>

                {/* Grade Level Cards */}
                <div className="space-y-4">
                    {GRADE_LEVELS.map((level) => {
                        const isSelected = selectedLevels.includes(level.id);

                        return (
                            <div
                                key={level.id}
                                onClick={() => toggleGradeLevel(level.id)}
                                className={`
                                    relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300
                                    ${isSelected
                                        ? 'bg-teal-500/10 border-teal-500 shadow-lg shadow-teal-500/20'
                                        : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <div className={`
                                        flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all
                                        ${isSelected
                                            ? 'bg-teal-600 shadow-lg shadow-teal-500/30'
                                            : 'bg-slate-800 border-2 border-slate-700'
                                        }
                                    `}>
                                        {isSelected && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {level.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-sm text-slate-400 font-semibold">Grades:</span>
                                            <span className="text-sm text-slate-300">
                                                {level.grades.join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save Button */}
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleSave}
                        className="
                            px-12 py-4 bg-teal-600 hover:bg-teal-700 
                            text-white font-bold text-lg rounded-2xl 
                            shadow-xl shadow-teal-600/30 hover:shadow-2xl hover:shadow-teal-600/40
                            transition-all duration-300 transform hover:scale-105
                        "
                    >
                        Save & Continue
                    </button>
                </div>

                {/* Selected Summary */}
                {selectedLevels.length > 0 && (
                    <div className="text-center">
                        <p className="text-sm text-slate-500">
                            Selected: <span className="text-teal-400 font-semibold">
                                {selectedLevels.map(id =>
                                    GRADE_LEVELS.find(l => l.id === id)?.name
                                ).join(', ')}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
