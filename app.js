const express = require("express");
const axios = require("axios");
// const { graphql, buildSchema } = require('graphql');
const { gql, ApolloServer } = require('apollo-server');


const app = express();
const port = 3000;


app.use(express.json());

async function getCoordinates(placeName) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${placeName}&format=json`
    );
    if (response.data && response.data[0]) {
      const { lat, lon } = response.data[0];
      return { latitude: lat, longitude: lon };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getWeatherForecast(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&forecast_days=7&daily=temperature_2m_max&timezone=PST`
    );

    if (response.data.daily) {
      const temperatureMax7Days = response.data.daily.temperature_2m_max;
      return temperatureMax7Days;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getNearbyRestaurants(latitude, longitude) {
  const bbox = `${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01
    }`;

  try {
    const response = await axios.get(
      `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`
    );

    const restaurants = response.data.elements.filter(
      (v) => v.tags && v.tags.amenity === "restaurant"
    );
    return restaurants;
  } catch (error) {
    console.log(error);
    return [];
  }
}

const coordinatesSchema = gql`
  type Coordinates {
    latitude: Float
    longitude: Float
  }
`;

const weatherSchema = gql`
  type Weather {
    temperatureMax7Days: [Float]
  }
`;

const restaurantSchema = gql`
  type Restaurant {
    name: String
    address: String
  }
`;

const citySchema = gql`
  type City {
    coordinates: Coordinates
    weather: Weather
    restaurants: [Restaurant]
  }
`;

const querySchema = gql`
  type Query {
    city(cityName: String!): City!
  }
`;

const resolvers = {
  Query: {
    city: async (_, { cityName }) => {
      const placeName = cityName;
      const coordinates = await getCoordinates(placeName);

      if (!coordinates) {
        return res.status(404).json({ message: "Lugar no encontrado" });
      }

      const { latitude, longitude } = coordinates;

      const temperatureMax7Days = await getWeatherForecast(latitude, longitude);

      if (temperatureMax7Days === null) {
        return res.status(404).json({ message: "Pronóstico no encontrado" });
      }

      const nearbyRestaurants = await getNearbyRestaurants(latitude, longitude);

      if (nearbyRestaurants.length === 0) {
        return res.status(404).json({ message: "Restaurantes no encontrados" });
      }

      return {
        coordinates: {
          latitude: latitude,
          longitude: longitude
        },
        weather: {
          temperatureMax7Days: temperatureMax7Days
        },
        restaurants: nearbyRestaurants.slice(0, 3).map((v) => {
          return {
            name: v.tags.name,
            address: v.tags["addr:street"],
          };
        })
      }
    },
  }
}

const server = new ApolloServer({
  typeDefs: [querySchema, citySchema, coordinatesSchema, weatherSchema, restaurantSchema],
  resolvers
});

server.listen({port:8080}).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});

/* app.get("/api/v2/ciudad/:cityName", async (req, res) => {
  const cityName = req.params.cityName;

  graphql(citySchema, `{ city(cityName: ${cityName}) { coordinates { latitude longitude } weather { temperatureMax7Days } restaurants { name address } } }`, root).then((response) => {
    res.status(200).json(response.data.city);
  });
});

async function getCoordinates(placeName) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${placeName}&format=json`
    );
    if (response.data && response.data[0]) {
      const { lat, lon } = response.data[0];
      return { latitude: lat, longitude: lon };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getWeatherForecast(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&forecast_days=7&daily=temperature_2m_max&timezone=PST`
    );

    if (response.data.daily) {
      const temperatureMax7Days = response.data.daily.temperature_2m_max;
      return temperatureMax7Days;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getNearbyRestaurants(latitude, longitude) {
  const bbox = `${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01
    }`;

  try {
    const response = await axios.get(
      `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`
    );

    const restaurants = response.data.elements.filter(
      (v) => v.tags && v.tags.amenity === "restaurant"
    );
    return restaurants;
  } catch (error) {
    console.log(error);
    return [];
  }
}

app.get("/api/v1/ciudad/:cityName/restaurantes", async (req, res) => {
  const placeName = req.params.cityName;

  const coordinates = await getCoordinates(placeName);

  if (!coordinates) {
    return res.status(404).json({ message: "Lugar no encontrado" });
  }

  const { latitude, longitude } = coordinates;

  const temperatureMax7Days = await getWeatherForecast(latitude, longitude);

  if (temperatureMax7Days === null) {
    return res.status(404).json({ message: "Pronóstico no encontrado" });
  }

  const nearbyRestaurants = await getNearbyRestaurants(latitude, longitude);

  if (nearbyRestaurants.length === 0) {
    return res.status(404).json({ message: "Restaurantes no encontrados" });
  }

  res.status(200).json({
    climaMañana: temperatureMax7Days[0],
    restaurantes: nearbyRestaurants.slice(0, 3).map((v) => {
      return {
        nombre: v.tags.name,
        direccion: v.tags["addr:street"],
      };
    }),
  });
});

app.get("/api/v1/ciudad/:cityName/clima/manhana", async (req, res) => {
  const placeName = req.params.cityName;

  const coordinates = await getCoordinates(placeName);

  if (!coordinates) {
    return res.status(404).json({ message: "Lugar no encontrado" });
  }

  const { latitude, longitude } = coordinates;

  const temperatureMax7Days = await getWeatherForecast(latitude, longitude);

  if (temperatureMax7Days === null) {
    return res.status(404).json({ message: "Pronóstico no encontrado" });
  }

  res.status(200).json({
    climaMañana: temperatureMax7Days[0],
  });
});

app.get("/api/v1/ciudad/:cityName/clima/7dias", async (req, res) => {
  const placeName = req.params.cityName;

  const coordinates = await getCoordinates(placeName);

  if (!coordinates) {
    return res.status(404).json({ message: "Lugar no encontrado" });
  }

  const { latitude, longitude } = coordinates;

  const temperatureMax7Days = await getWeatherForecast(latitude, longitude);

  if (temperatureMax7Days === null) {
    return res.status(404).json({ message: "Pronóstico no encontrado" });
  }

  res.status(200).json({
    clima7Dias: temperatureMax7Days,
  });
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en el puerto ${port}`);
}); */
