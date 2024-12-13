import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';

interface LocationType {
  latitude: number;
  longitude: number;
}

export default function App() {
  const [location, setLocation] = useState<LocationType | null>(null); 
  const [route, setRoute] = useState<Array<{ latitude: number; longitude: number }>>([]); 
  const [errorMsg, setErrorMsg] = useState<string>("");
  const trailsVariants = [3,6,10]

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permisiunea pentru locație nu a fost acordată.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords); 
    })();
  }, []);

  const getRoute = async (distance: number): Promise<void> => {
    if (!location) return; 
    const earthRadiusKm = 6371; 

    const radiusInRadians = distance / earthRadiusKm;
    const origin = `${location.latitude},${location.longitude}`;
    const randomLatOffset = (Math.random() - 0.5) * 2 * radiusInRadians;
    const randomLonOffset = (Math.random() - 0.5) * 2 * radiusInRadians / Math.cos(location.latitude * Math.PI / 180);

    const newLat = location.latitude + randomLatOffset * (180 / Math.PI); 
    const newLon = location.longitude + randomLonOffset * (180 / Math.PI); 

    const clampedLat = Math.max(-90, Math.min(90, newLat));
    const clampedLon = Math.max(-180, Math.min(180, newLon));

    const destination = `${clampedLat},${clampedLon}`;
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?destination=${destination}&origin=${origin}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.routes.length > 0) {
        const points = response.data.routes[0].legs[0].steps.map((step: any) => step.end_location);
        const routeCoordinates = points.map((point: { lat: number; lng: number }) => ({
          latitude: point.lat,
          longitude: point.lng,
        }));
  
        setRoute(routeCoordinates);
      } else {
        setErrorMsg('Nu s-a găsit un traseu pentru distanța aleasă.');
      }
    } catch (error) {
      setErrorMsg('A apărut o eroare la obținerea traseului.');
    }  
  };

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>Se obține locația...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}>
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
        
        {route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeColor="blue"
            strokeWidth={6}
          />
        )}
      </MapView>
      
      <View style={styles.buttonsContainer}>
        {trailsVariants.map(trail => (
        <Button title={`Traseu ${trail} km`} onPress={() => getRoute(trail)} />)
)}
      </View>
      {errorMsg && <Text>{errorMsg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: '#FFFFF'
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
});
