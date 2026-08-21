-- PostgreSQL Schema for LawLM Production Database

-- 1. General Settings
CREATE TABLE general_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_text VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  whatsapp VARCHAR(50),
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Hero Section
CREATE TABLE hero_section (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Why Choose Us Section
CREATE TABLE why_choose_us (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT NOT NULL,
  paragraph1 TEXT NOT NULL,
  paragraph2 TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Practice Areas (Hukuk Alanları)
CREATE TABLE practice_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) DEFAULT 'Scale',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Team (Avukat Kadrosu)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  image_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Mock Data
INSERT INTO general_settings (logo_text, address, phone, email, whatsapp)
VALUES ('AttorCO', 'Los Angeles Gournadi', '+1 (212) 255-5511', 'mail@attorco.com', '+1234567890');

INSERT INTO hero_section (title, subtitle)
VALUES ('Dedicated To One Client At A Time.', 'WE FIGHT FOR JUSTICE');

INSERT INTO why_choose_us (title, subtitle, paragraph1, paragraph2)
VALUES (
  'WHY CHOOSE US',
  'Why You Need the Top Lawyers in',
  'We''re a financial and consulting business company of professional thinkers...',
  'Our sense of curiosity brings brands to life...'
);
