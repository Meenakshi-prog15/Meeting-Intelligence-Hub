export async function pollTaskStatus(taskId, interval = 2000, maxRetries = 60) {
    let retries = 0;
    while (retries < maxRetries) {
        const response = await fetch(`http://localhost:8000/task/${taskId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch task status: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.status === 'completed') {
            return data.result;
        } else if (data.status === 'failed') {
            throw new Error(`Task failed: ${data.error}`);
        }
        
        // If status is 'processing', wait before polling again
        await new Promise(resolve => setTimeout(resolve, interval));
        retries++;
    }
    throw new Error('Task polling timed out');
}
