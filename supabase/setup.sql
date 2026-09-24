-- ============================================================
-- VKU Study Room Booking - Supabase Database Setup
-- Run this SQL in your Supabase project's SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
-- Stores user profile data linked to auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  faculty TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 2. ROOMS TABLE
-- Stores study room / lab information
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  capacity INTEGER NOT NULL DEFAULT 2,
  equipment JSONB NOT NULL DEFAULT '[]'::JSONB,
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_lab BOOLEAN NOT NULL DEFAULT false,
  lab_spec TEXT DEFAULT NULL,
  opening_hours TEXT NOT NULL DEFAULT '07:00 - 21:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read rooms
CREATE POLICY "Authenticated users can view rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (true);


-- 3. BOOKINGS TABLE
-- Stores all booking/reservation records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  slot_id TEXT NOT NULL,
  slot_label TEXT NOT NULL,
  student_id TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  student_email TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked-in', 'cancelled', 'completed')),
  qr_code_payload TEXT DEFAULT '',
  notification_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

-- All authenticated users can view active bookings (for conflict detection)
CREATE POLICY "Authenticated users can view active bookings for conflict check"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (status IN ('confirmed', 'checked-in'));

-- Users can create their own bookings
CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (cancel, check-in)
CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Unique constraint to prevent double bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking
  ON public.bookings (room_id, date, slot_id)
  WHERE status IN ('confirmed', 'checked-in');

-- Index for fast user booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON public.bookings (room_id, date);


-- 4. AUTO-CREATE PROFILE ON USER SIGN UP
-- Trigger function that creates a profile when a new user registers
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 5. SEED ROOMS DATA
-- Insert the VKU study rooms (same as mock data)
-- ============================================================
INSERT INTO public.rooms (id, name, building, floor, capacity, equipment, image_url, description, is_lab, lab_spec, opening_hours) VALUES
  ('room-a-204', 'Smart Seminar Room A.204', 'A', 2, 12, '["Projector", "Whiteboard", "AC", "Video Conference", "Sound System"]'::JSONB, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80', 'Modern seminar room designed for capstone project defenses and hybrid presentations with dual 4K monitors and omnidirectional microphones.', false, NULL, '07:00 - 21:00'),
  ('room-a-102', 'Agile Collab Space A.102', 'A', 1, 6, '["Whiteboard", "AC", "Projector"]'::JSONB, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', 'Compact team pod with magnetic wall-to-wall whiteboard for brainstorming, sprint reviews, and pair programming sessions.', false, NULL, '07:00 - 21:00'),
  ('room-a-301', 'Executive Boardroom A.301', 'A', 3, 18, '["Projector", "AC", "Video Conference", "Sound System"]'::JSONB, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80', 'Formal conference hall equipped with enterprise teleconferencing hardware, central podium, and ergonomic leather seating.', false, NULL, '07:30 - 20:00'),
  ('room-b-305', 'Mobile App Dev Lab B.305', 'B', 3, 20, '["High-spec PC", "AC", "Projector", "Whiteboard"]'::JSONB, 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80', 'High-performance workstation lab equipped with Core i9 computers, iOS/Android test benches, and dual 27-inch displays.', true, '20x Intel Core i9, 32GB RAM, RTX 4070, Dual Displays', '07:30 - 21:30'),
  ('room-b-202', 'Digital Media Studio B.202', 'B', 2, 8, '["High-spec PC", "AC", "Sound System"]'::JSONB, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80', 'Acoustically treated studio for podcast recording, UI/UX animation rendering, and high-fidelity video editing.', true, '8x Mac Studio M2 Max, Audio Technica Mics, Studio Monitors', '08:00 - 21:00'),
  ('room-b-108', 'Korean Culture & Study Hub B.108', 'B', 1, 10, '["Whiteboard", "AC", "Sound System", "Projector"]'::JSONB, 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80', 'Cozy study lounge dedicated to student exchange programs, language practice groups, and cultural project work.', false, NULL, '07:00 - 21:00'),
  ('room-c-203', 'Cisco Networking Lab C.203', 'C', 2, 16, '["High-spec PC", "Projector", "Whiteboard", "AC"]'::JSONB, 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80', 'Specialized lab featuring physical server racks, Cisco Catalyst switches, router test units, and packet analysis workstations.', true, 'Cisco 2960 Switches, 2901 Routers, Wireshark Network Nodes', '07:30 - 20:30'),
  ('room-c-105', 'Quiet Focus Pod C.105', 'C', 1, 2, '["AC", "Whiteboard"]'::JSONB, 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=80', 'Sound-dampened two-person booth for intensive deep work, competitive programming contests, and pair interview prep.', false, NULL, '07:00 - 22:00'),
  ('room-c-308', 'Cyber Security Lab C.308', 'C', 3, 14, '["High-spec PC", "AC", "Projector"]'::JSONB, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', 'Isolated cyber range environment for penetration testing, CTF competitions, and malware reverse-engineering drills.', true, 'Dedicated VLAN, Proxmox VE Server Cluster, Kali Linux Workstations', '08:00 - 21:00'),
  ('room-v-402', 'VKU AI & GPU Cluster V.402', 'V', 4, 16, '["High-spec PC", "AC", "Video Conference", "Projector", "Whiteboard"]'::JSONB, 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80', 'Flagship innovation center in Building V with access to DGX GPU servers for deep learning, LLM fine-tuning, and CV model training.', true, 'NVIDIA RTX A6000 Workstations + Remote Slurm cluster access', '07:00 - 22:00'),
  ('room-v-201', 'Robotics & IoT Innovation Hub V.201', 'V', 2, 15, '["High-spec PC", "Whiteboard", "AC", "Sound System"]'::JSONB, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80', 'Equipped with 3D printers, soldering stations, oscilloscopes, drone arenas, and Raspberry Pi / Jetson Nano developer kits.', true, '4x Bambu Lab 3D Printers, Soldering Benches, Jetson Orin Nano kits', '07:30 - 21:30'),
  ('room-v-104', 'VKU Maker Space & Startup Pitch V.104', 'V', 1, 20, '["Projector", "Whiteboard", "AC", "Video Conference", "Sound System"]'::JSONB, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', 'Open collaborative startup amphitheater with modular furniture, presentation stage, and ideation glass walls.', false, NULL, '07:00 - 22:00')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- DONE! Your database is now ready.
-- 
-- NEXT STEPS:
-- 1. Go to Authentication > Providers > Google in your Supabase dashboard
-- 2. Enable Google provider and add your OAuth credentials
-- 3. Set the Redirect URL to your Expo app's auth callback URL
-- 4. Update src/lib/supabase.ts with your project URL and anon key
-- ============================================================
