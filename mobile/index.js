// Custom entry: the screenshot shim must run before React Native Web reads the
// viewport size. It does nothing outside ?device=iphone16 on web.
import "./src/lib/screenshot-shim";
import "expo-router/entry";
