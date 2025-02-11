const express = require("express");
const path = require("path");
const formidable = require('formidable');
const fs = require('fs');
const { nanoid } = require("nanoid"); 


const app = express();
const PORT = 3000;

const allowedVideoFormats = ['.mp4', '.mkv', '.webm', '.mov'];
const allowedMimeTypes = ['video/mp4', 'video/x-matroska', 'video/webm', 'video/x-msvideo', 'video/quicktime'];

app.use(express.static("public"));

app.post("/fileupload", (req, res) => {
    console.log("File upload started");

    // Ensure the 'videos' directory exists
    const videosDir = path.join(__dirname, "videos");
    if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir);
        console.log("Videos directory created:", videosDir);
    }

    // Initialize Formidable (Add `{ multiples: true }` to handle multiple files)
    const form = new formidable.IncomingForm({ multiples: true, keepExtensions: true });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error("Error during file upload:", err);
            return res.status(500).send("Error during file upload.");
        }

        console.log("Uploaded files:", files); // Debugging to check structure

        // Ensure file is uploaded (check if it's an array or object)
        const uploadedFile = Array.isArray(files.fileUpload) ? files.fileUpload[0] : files.fileUpload;
        if (!uploadedFile || !uploadedFile.filepath) {
            return res.status(400).send("No file uploaded.");
        }

        const oldPath = uploadedFile.filepath; // ✅ Corrected from `path` to `filepath`
        const ext = path.extname(uploadedFile.originalFilename); // Preserve file extension
        
        const mimeType = uploadedFile.mimetype; 
        if (!allowedMimeTypes.includes(mimeType)) {
            return res.status(400).send("Invalid file type. Only video files are allowed.");
        }
        if (!allowedVideoFormats.includes(ext)) {
            return res.status(400).send("Invalid file format. Only video files are allowed.");
        }

        const newFileName = `${nanoid(8)}${ext}`; // Generate unique name (8 characters)
        const newPath = path.join(videosDir, newFileName); // Move to 'videos' directory
        console.log(`New file path: ${newPath}`);

        // Move file to the new location
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error("Error moving file:", err);
                return res.status(500).send("Error saving file.");
            }
            console.log(`File moved to: ${newPath}`);
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document</title>
                    <style>
                        @import url("https://fonts.googleapis.com/css2?family=Titan+One&display=swap");
                        header { position: relative; font-weight: 400; font-size: 10vh; font-family: "Titan One", serif; text-align: center; }
                        #tooltip { position: relative; font-family: "Titan One", serif; font-weight: lighter; font-size: 3vh; font-weight: 100; text-align: center; }
                        .file-upload { display: none; }
                        .custom-button { padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
                        .custom-button:hover { background-color: #45a049; }
                        form { position: relative; top: 26vh; left: 46vw; }
                        #copylink { position: relative; top: 24vh; text-align: center; font-family: sans-serif; }
                    </style>
                </head>
                <body>
                    <header>Generate an embed</header>
                    <h3 id="tooltip">Useful for when your embed is too big for Discord</h3>
                    <h3 id="copylink">Generating link...</h3>

                    <script>
                        const serverUrl = window.location.origin;
                        const fileName = "${newFileName}"; // Inserted dynamically from server
                        const embedLink = \`\${serverUrl}/play?filelocation=\${fileName}\`;

                        console.log("Server URL:", serverUrl);
                        console.log("Generated Link:", embedLink);

                        document.getElementById("copylink").innerText = embedLink;
                    </script>
                </body>
                </html>
            `);    
        });
    });
});

app.get("/", (req, res) => {
    console.log("Received request with query:", req.query);
    const fileLocation = req.query.filelocation;

    if (!fileLocation) {
        console.log("here");
        res.sendFile(path.join(__dirname, "public", "index.html"));
        return res.status(300)
    }

    const sanitizedPath = path.basename(fileLocation); // Prevent directory traversal
    const fileExt = path.extname(sanitizedPath).toLowerCase();

    // if (!allowedExtensions.includes(fileExt)) {
    //     return res.status(403).send("Invalid file type.");
    // }

    res.send(`
        <html>
            <head>
                <title>${sanitizedPath}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta property="og:video" content="/videos/${sanitizedPath}" id="vidpart">
            </head>
            <body>
                <video controls autoplay>
                    <source src="/videos/${sanitizedPath}" type="video/${fileExt.slice(1)}">
                    Your browser does not support the video tag.
                </video>
            </body>
        </html>
    `);
});

app.get("/test", (req, res) => {
    console.log("Test route hit!");
    res.send("Server is working!");
});

app.get("/play", (req, res) => {
    console.log("Received request with query:", req.query); // Debugging line

    const fileLocation = req.query.filelocation;
    if (!fileLocation) {
        console.log("here");
        res.sendFile(path.join(__dirname, "public", "index.html"));
        return res.status(300)
    }

    const sanitizedPath = path.basename(fileLocation); // Prevent directory traversal
    const fileExt = path.extname(sanitizedPath).toLowerCase();

    // if (!allowedExtensions.includes(fileExt)) {
    //     return res.status(403).send("Invalid file type.");
    // }

    res.send(`
        <html>
            <head>
                <title>${sanitizedPath}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta property="og:video" content="/videos/${sanitizedPath}" id="vidpart">
                <style>
                body {
    background: black;                
}
                </style>
            </head>
            <body>
            <div class="content">
                <video controls autoplay>
                    <source src="/videos/${sanitizedPath}" type="video/${fileExt.slice(1)}">
                    Your browser does not support the video tag.
                </video>
            </div>
            </body>
        </html>
    `);
});
// Serve videos from the "videos" folder
app.use("/videos", express.static(path.join(__dirname, "videos")));

app.listen(PORT);