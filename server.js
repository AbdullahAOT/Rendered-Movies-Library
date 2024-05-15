const express = require("express");
const app = express();
const movieData = require("./Movie_Data/data.json");
const axios = require("axios");
require("dotenv").config();
const pg = require("pg");
const readline = require("readline");
const { Server } = require("http");
app.use(express.json());

const client = new pg.Client('postgresql://localhost:5432/movies');

function Movie(title, poster_path, overview) {
    this.title = title;
    this.poster_path = poster_path;
    this.overview = overview;
}

app.get("/", (req, res) => {
    let movieArray = [];
    movieData.map((item) => {
        let singleMovie = new Movie(item.title, item.poster_path, item.overview);
        movieArray.push(singleMovie);
    });
    res.send(movieArray);
});

app.get("/favourite", (req, res) => {
    res.send("<h1>Welcome to Favourite Page</h1>");
});

app.get("/trending", trendingPageHandler);
app.get("/search", searchPageHandler);
app.get("/now_playing", nowPlayingPageHandler);
app.get("/upcoming", upcomingPageHandler);
app.get("/get_movies", getMoviesHandler);
app.post("/add_movie", addMovieHandler);
app.put("/update_movie/:id", updateMovieHandler);
app.delete("/delete_movie/:id", deleteMovieHandler);
app.get("/get_movie/:id", getMovieHandler);

function getMoviesHandler(req, res) {
    const sql = "SELECT * FROM movies";
    client.query(sql)
        .then(data => {
            res.send(data.rows);
        })
        .catch(err => {
            res.status(500).send(err);
        })
}

function addMovieHandler(req, res) {
    const movieToAdd = req.body;
    const sql = "INSERT INTO movies (title, summary) VALUES ($1, $2) RETURNING *";
    const values = [movieToAdd.title, movieToAdd.summary];
    client.query(sql, values)
        .then(data => {
            res.send("Your movie was added succesfully");
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

function updateMovieHandler(req, res) {
    const movieId = req.params.id;
    const sql = `UPDATE movies SET title = $1, summary=$2 WHERE id = ${movieId} RETURNING *`;
    const values = [req.body.title,req.body.summary];
    client.query(sql, values)
        .then(data => {
            res.status(200).send(data.rows);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

function deleteMovieHandler(req, res) {
    const movieId = req.params.id;
    const sql = `DELETE FROM movies where id=${movieId}`;
    client.query(sql)
        .then(data => {
            res.status(204).json({});
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

function getMovieHandler(req, res) {
    const movieId = req.params.id;
    const sql = `SELECT * FROM movies WHERE id = ${movieId}`;
    client.query(sql)
        .then(data => {
            res.status(200).send(data.rows);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

function trendingPageHandler(req, res) {
    const apiKey = process.env.API_Key;
    let trendingEndpoint = `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&language=en-US`;
    let arrayOfSpecificInformationMovies = [];
    axios.get(trendingEndpoint)
        .then(trendingResponse => {
            trendingResponse.data.results.map(specificInformationMovie => {
                let newMovie = new Movie(specificInformationMovie.title, specificInformationMovie.poster_path, specificInformationMovie.overview);
                arrayOfSpecificInformationMovies.push(newMovie);
            });
            res.send(arrayOfSpecificInformationMovies);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

function searchPageHandler(req, res) {
    let movieNameToSearchFor = req.query.movieName;
    const apiKey = process.env.API_Key;
    let axiosPromises = [];
    let foundMovie = false;

    for (let i = 1; i <= 500 && !foundMovie; i++) {
        let searchEndpoint = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(movieNameToSearchFor)}&page=${i}`;
        axiosPromises.push(
            axios.get(searchEndpoint)
                .then(searchResponse => {
                    const foundMovies = searchResponse.data.results.filter(specificInformationMovie => (specificInformationMovie.title).toLowerCase() === movieNameToSearchFor.toLowerCase());
                    if (foundMovies.length > 0) {
                        foundMovie = true;
                        return foundMovies[0];
                    } else {
                        return null;
                    }
                })
                .catch(error => {
                    console.error(error);
                    return null;
                })
        );
    }

    Promise.all(axiosPromises)
        .then(resultMoviesArray => {
            const foundMovie = resultMoviesArray.find(movie => movie !== null);
            if (foundMovie) {
                let movieToDisplay = new Movie(foundMovie.title, foundMovie.poster_path, foundMovie.overview);
                res.send(movieToDisplay);
            }
            else {
                res.status(404).send("Movie not found");
            }
        })
        .catch(error => {
            console.error(error);
            res.status(500).send("Internal server error");
        });
}

function nowPlayingPageHandler(req, res) {
    const apiKey = process.env.API_Key;
    let nowPlayingEndpoint = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=en-US`;
    let arrayOfSpecificInformationMovies = [];
    axios.get(nowPlayingEndpoint)
        .then(Response => {
            Response.data.results.map(specificInformationMovie => {
                let newMovie = new Movie(specificInformationMovie.title, specificInformationMovie.poster_path, specificInformationMovie.overview);
                arrayOfSpecificInformationMovies.push(newMovie);
            });
            res.send(arrayOfSpecificInformationMovies);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

function upcomingPageHandler(req, res) {
    const apiKey = process.env.API_Key;
    let nowPlayingEndpoint = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US`;
    let arrayOfSpecificInformationMovies = [];
    axios.get(nowPlayingEndpoint)
        .then(Response => {
            Response.data.results.map(specificInformationMovie => {
                let newMovie = new Movie(specificInformationMovie.title, specificInformationMovie.poster_path, specificInformationMovie.overview);
                arrayOfSpecificInformationMovies.push(newMovie);
            });
            res.send(arrayOfSpecificInformationMovies);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

app.use((req, res, next) => {
    res.status(404).send("<h1>Page not found!</h1>");
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("<h1>Sorry, Something went Wrong!</h1>");
});

const port = 7777;

client.connect()
    .then(() => {
        app.listen(port, () => {
            console.log("Server is running at port 7777");
        });
    });