// components/WaitressManager.tsx
import React, { useEffect } from 'react';
import { useWaitressData } from '@/hooks/useWaitressData';

export function WaitressManager() {
    const { 
        data, 
        loading, 
        error, 
        loadData, 
        addWaitress,
        updateWaitress,
        deleteWaitress,
        hasData,
        isValid 
    } = useWaitressData();

    useEffect(() => {
        // Load data when component mounts
        loadData();
    }, []);

    if (loading) return <div>Loading waitresses...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h2>Waitresses</h2>
            {!isValid && <div>⚠️ Data integrity check failed</div>}
            {!hasData && <div>No waitress data found</div>}
            
            <button onClick={() => {
                addWaitress({
                    _id: Date.now().toString(),
                    name: 'New Waitress',
                    phone: '1234567890',
                    shift: 'MORNING',
                    isActive: true
                });
            }}>
                Add Waitress
            </button>

            <ul>
                {data?.map(waitress => (
                    <li key={waitress._id}>
                        {waitress.name} - {waitress.shift}
                        <button onClick={() => {
                            updateWaitress(waitress._id, { isActive: !waitress.isActive });
                        }}>
                            Toggle Active
                        </button>
                        <button onClick={() => {
                            deleteWaitress(waitress._id);
                        }}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}