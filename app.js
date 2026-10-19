// Local browser database
const localDB = new PouchDB("movies_local");

// Remote CouchDB database
const remoteDB = new PouchDB(
    "http://localhost:5984/schema_a",
    {
        auth: {
            username: "admin",
            password: "mtu12345"
        }
    }
);

const movieForm = document.getElementById("movieForm");
const movieList = document.getElementById("movieList");
const syncStatus = document.getElementById("syncStatus");


// -------------------------------
// LIVE DATABASE SYNCHRONIZATION
// -------------------------------

localDB.sync(remoteDB, {
    live: true,
    retry: true
})

.on("change", function(info) {
    syncStatus.textContent = "Sync status: synchronizing";
    loadMovies();
})


.on("paused", function(error) {
    if (error) {
        syncStatus.textContent =
            "Sync status: paused due to an error";

        console.error("Replication paused:", error);
    } else {
        syncStatus.textContent =
            "Sync status: idle (no current changes)";
    }
})


.on("active", function() {
    syncStatus.textContent = "Sync status: synchronization active";
})

.on("denied", function(err) {
    console.error("Replication denied:", err);
    syncStatus.textContent = "Sync status: denied";
})

.on("error", function(err) {
    console.error("Sync error:", err);
    syncStatus.textContent = "Sync status: error/offline";
});


// -------------------------------
// CREATE
// -------------------------------

movieForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const title =
        document.getElementById("title").value.trim();

    const actors =
        document.getElementById("actors").value
            .split(",")
            .map(actor => actor.trim())
            .filter(Boolean);

    const genres =
        document.getElementById("genres").value
            .split(",")
            .map(genre => genre.trim())
            .filter(Boolean);

    const movie = {

        _id:
            "movie_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        title: title,
        actors: actors,
        genres: genres
    };

    try {

        await localDB.put(movie);

        movieForm.reset();

        await loadMovies();

    } catch (error) {

        console.error(error);

    }
});


// -------------------------------
// READ
// -------------------------------

async function loadMovies() {

    try {

        const result = await localDB.allDocs({
            include_docs: true,
            descending: true
        });

        movieList.innerHTML = "";

        result.rows.forEach(row => {

            const movie = row.doc;

            if (
                !movie ||
                movie._deleted ||
                movie._id.startsWith("_design/")
            ) {
                return;
            }

            const div = document.createElement("div");

            div.className = "movie";

            div.innerHTML = `
                <h3>${escapeHtml(movie.title || "")}</h3>

                <p>
                    <strong>Actors:</strong>
                    ${escapeHtml(
                        (movie.actors || []).join(", ")
                    )}
                </p>

                <p>
                    <strong>Genres:</strong>
                    ${escapeHtml(
                        (movie.genres || []).join(", ")
                    )}
                </p>

                <button onclick="editMovie('${movie._id}')">
                    Edit
                </button>

                <button onclick="deleteMovie('${movie._id}')">
                    Delete
                </button>
            `;

            movieList.appendChild(div);
        });

    } catch (error) {

        console.error(error);

    }
}


// -------------------------------
// UPDATE
// -------------------------------

async function editMovie(id) {

    try {

        const movie = await localDB.get(id);

        const title = prompt(
            "Movie title:",
            movie.title
        );

        if (title === null) {
            return;
        }

        const actors = prompt(
            "Actors separated by commas:",
            (movie.actors || []).join(", ")
        );

        if (actors === null) {
            return;
        }

        const genres = prompt(
            "Genres separated by commas:",
            (movie.genres || []).join(", ")
        );

        if (genres === null) {
            return;
        }

        movie.title = title.trim();

        movie.actors =
            actors
                .split(",")
                .map(actor => actor.trim())
                .filter(Boolean);

        movie.genres =
            genres
                .split(",")
                .map(genre => genre.trim())
                .filter(Boolean);

        await localDB.put(movie);

        await loadMovies();

    } catch (error) {

        console.error(error);

    }
}


// -------------------------------
// DELETE
// -------------------------------

async function deleteMovie(id) {

    if (!confirm("Delete this movie?")) {
        return;
    }

    try {

        const movie =
            await localDB.get(id);

        await localDB.remove(movie);

        await loadMovies();

    } catch (error) {

        console.error(error);

    }
}


// -------------------------------
// BASIC OUTPUT SAFETY
// -------------------------------

function escapeHtml(value) {

    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// Initial display
loadMovies();