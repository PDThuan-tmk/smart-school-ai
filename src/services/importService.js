export async function processBatch(items, batchSize, callback) {

    for (let i = 0; i < items.length; i += batchSize) {

        const batch = items.slice(i, i + batchSize);

        await Promise.all(

            batch.map(item => callback(item))

        );

    }

}