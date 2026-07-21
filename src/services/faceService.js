import * as faceapi from "face-api.js";
import { getStudentsByClass } from "./studentService";

export async function loadLabeledImages(className) {

    const students = await getStudentsByClass(className);

    console.log("Đọc được", students.length, "học sinh");

    const labeledDescriptors = [];

    for (const student of students) {

        try {

            console.log("Student:", student);

            const descriptors = [];

            for (let i = 0; i < 10; i++) {

                const d = student[`descriptor${i}`];

                if (Array.isArray(d) && d.length === 128) {

                    descriptors.push(
                        new Float32Array(d)
                    );

                }

            }

            if (descriptors.length === 0) {

                console.log(
                    "❌ Không có descriptor:",
                    student.studentId
                );

                continue;

            }

            console.log(
                "✅",
                student.studentId,
                "=>",
                descriptors.length,
                "descriptor(s)"
            );

            labeledDescriptors.push(

                new faceapi.LabeledFaceDescriptors(
                    student.studentId,
                    descriptors
                )

            );

        }
        catch (err) {

            console.error(
                "Lỗi:",
                student.studentId,
                err
            );

        }

    }

    console.log(
        "Loaded:",
        labeledDescriptors.length
    );

    return labeledDescriptors;

}