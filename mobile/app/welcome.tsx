import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Backdrop, Glass } from "@/components/glass";
import { Button, type IconName } from "@/components/ui";
import { AttendanceRing } from "@/components/AttendanceRing";
import { colors } from "@/theme";
import { useAuth } from "@/lib/auth";
import { screenshotSlide } from "@/lib/screenshot";

export const WELCOME_SEEN_KEY = "oasis.welcomeSeen";

type Slide = { title: string; body: string; art: () => React.ReactNode };

function Chip({ icon, label, color, style }: { icon: IconName; label: string; color: string; style?: object }) {
  return (
    <View style={[{ position: "absolute", borderRadius: 999, shadowColor: "#3f4180", shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, style]}>
      <Glass radius={999} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingLeft: 9, paddingRight: 14 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={15} color={color} />
        </View>
        <Text style={{ fontSize: 13.5, color: colors.slate800, fontWeight: "600" }}>{label}</Text>
      </Glass>
    </View>
  );
}

function Orb({ children, size = 190 }: { children: React.ReactNode; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, shadowColor: "#4c4ea3", shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } }}>
      <Glass radius={size / 2} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {children}
      </Glass>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    title: "Your whole school,\nin your pocket",
    body: "Students, staff, fees, timetables and 20 more modules - the same OASIS you use on the web, built for your phone.",
    art: () => (
      <View style={{ width: 320, height: 300, alignItems: "center", justifyContent: "center" }}>
        <Orb>
          <Image source={require("../assets/logo-mark.png")} style={{ width: 96, height: 88 }} resizeMode="contain" />
        </Orb>
        <Chip icon="users" label="24 students" color={colors.oasis600} style={{ top: 18, left: 0 }} />
        <Chip icon="credit-card" label="Fees" color="#f59e0b" style={{ top: 70, right: 0 }} />
        <Chip icon="calendar" label="Timetable" color="#ec4899" style={{ bottom: 30, left: 12 }} />
        <Chip icon="book-open" label="Exams" color="#0ea5e9" style={{ bottom: 6, right: 22 }} />
      </View>
    ),
  },
  {
    title: "Attendance\nin seconds",
    body: "Mark the register from the classroom, see who's in at a glance and follow up absences straight away.",
    art: () => (
      <View style={{ width: 320, height: 300, alignItems: "center", justifyContent: "center" }}>
        <Orb size={210}>
          <AttendanceRing
            size={150}
            stroke={16}
            centerLabel="96%"
            centerSub="in school"
            segments={[
              { value: 21, color: "#10b981" },
              { value: 2, color: "#f59e0b" },
              { value: 1, color: "#f43f5e" },
            ]}
          />
        </Orb>
        <Chip icon="check-circle" label="21 present" color="#10b981" style={{ top: 14, left: 4 }} />
        <Chip icon="clock" label="2 late" color="#f59e0b" style={{ bottom: 24, right: 4 }} />
      </View>
    ),
  },
  {
    title: "Always in sync\nwith the web",
    body: "Changes made on your phone appear on the OASIS website instantly - and the other way round. One school, one source of truth.",
    art: () => (
      <View style={{ width: 320, height: 300, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 18 }}>
        <Orb size={120}>
          <Feather name="monitor" size={46} color={colors.oasis600} />
        </Orb>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Feather name="repeat" size={26} color={colors.oasis500} />
        </View>
        <Orb size={120}>
          <Feather name="smartphone" size={46} color={colors.oasis600} />
        </Orb>
        <Chip icon="zap" label="Live updates" color="#8b5cf6" style={{ top: 24, left: 92 }} />
        <Chip icon="shield" label="Secure by school" color="#10b981" style={{ bottom: 26, left: 64 }} />
      </View>
    ),
  },
];

export default function Welcome() {
  const { width } = useWindowDimensions();
  const { enterDemo } = useAuth();
  const [page, setPage] = useState(screenshotSlide);
  const scroller = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  async function finish(to: "/login" | "/signup") {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1").catch(() => {});
    router.replace(to);
  }

  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 6 }}>
          <Image source={require("../assets/logo.png")} style={{ width: 96, height: 34 }} resizeMode="contain" />
          {!last && (
            <Pressable onPress={() => finish("/login")} hitSlop={10}>
              <Glass radius={999} interactive style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, color: colors.slate700, fontWeight: "600" }}>Skip</Text>
              </Glass>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: screenshotSlide * width, y: 0 }}
          onContentSizeChange={(w) => {
            // contentOffset is ignored on web; jump there once every slide is laid out.
            if (screenshotSlide && w >= (screenshotSlide + 1) * width) scroller.current?.scrollTo({ x: screenshotSlide * width, animated: false });
          }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide) => (
            <View key={slide.title} style={{ width, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
              {slide.art()}
              <Text style={{ fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: colors.slate900, textAlign: "center", marginTop: 34 }}>{slide.title}</Text>
              <Text style={{ fontSize: 16, lineHeight: 24, color: colors.slate500, textAlign: "center", marginTop: 14, maxWidth: 330 }}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 24, paddingBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 7, marginBottom: 10 }}>
            {SLIDES.map((_, i) => (
              <View key={i} style={{ height: 8, width: i === page ? 26 : 8, borderRadius: 4, backgroundColor: i === page ? colors.oasis500 : "rgba(148,152,239,0.3)" }} />
            ))}
          </View>
          {last ? (
            <>
              <Button size="lg" onPress={() => finish("/signup")}>
                Create a school account
              </Button>
              <Button size="lg" variant="secondary" onPress={() => finish("/login")}>
                I already have an account
              </Button>
              <Button
                variant="ghost"
                onPress={async () => {
                  await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1").catch(() => {});
                  await enterDemo();
                  router.replace("/(tabs)");
                }}
              >
                Explore the demo school
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              icon="arrow-right"
              onPress={() => {
                const next = page + 1;
                scroller.current?.scrollTo({ x: next * width, animated: true });
                setPage(next);
              }}
            >
              Continue
            </Button>
          )}
        </View>
      </SafeAreaView>
    </Backdrop>
  );
}
