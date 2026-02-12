import { useEffect, useState } from 'react';
import { WorkoutSession, getWorkouts } from '../../services/workouts';

export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadWorkouts();
    }, []);

    const loadWorkouts = async () => {
        try {
            setLoading(true);
            const data = await getWorkouts();
            setWorkouts(data);
        } catch (err) {
            setError('Failed to load workouts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-600">{error}</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">My Workouts</h1>
            
            {workouts.length === 0 ? (
                <p className="text-gray-600">No workouts yet. Create your first workout!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workouts.map((workout) => (
                        <div
                            key={workout.id}
                            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                        >
                            <h3 className="text-xl font-semibold mb-2">{workout.name}</h3>
                            {workout.description && (
                                <p className="text-gray-600 mb-2">{workout.description}</p>
                            )}
                            {workout.workout_type && (
                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                    {workout.workout_type}
                                </span>
                            )}
                            <div className="mt-4 text-sm text-gray-500">
                                <p>{workout.accelerometer_data.length} data files</p>
                                <p>{workout.graph_images.length} graphs</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
