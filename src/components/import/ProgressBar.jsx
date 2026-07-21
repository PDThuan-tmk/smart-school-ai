export default function ProgressBar({

    progress,

    isImporting,

    stopImport

}) {

    if (!isImporting) return null;

    return (

        <div className="mt-6">

            {

                stopImport && (

                    <div className="text-red-600 font-bold mb-2">

                        🛑 Đang dừng Import...

                    </div>

                )

            }

            <div className="flex justify-between mb-2">

                <span>Đang Import...</span>

                <span>{progress}%</span>

            </div>

            <div className="w-full h-5 bg-gray-200 rounded-full">

                <div

                    className="h-5 bg-green-600 rounded-full transition-all duration-300"

                    style={{

                        width: `${progress}%`

                    }}

                />

            </div>

        </div>

    );

}