/*
  # Add Additional Fields to License Processes

  1. Schema Changes
    - Add location (text) - Full address of the project
    - Add area (numeric) - Total area in hectares
    - Add coordinates (text) - GPS coordinates
    - Add environmental_impact (text) - Impact level assessment
    - Add estimated_value (numeric) - Estimated investment value

  2. Purpose
    - Support complete process creation form
    - Store all project details from 4-step wizard

  ## Notes
  - All fields are nullable for backward compatibility
  - Fields support the complete licensing process workflow
*/

-- Add location field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_processes' AND column_name = 'location'
  ) THEN
    ALTER TABLE license_processes ADD COLUMN location text;
  END IF;
END $$;

-- Add area field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_processes' AND column_name = 'area'
  ) THEN
    ALTER TABLE license_processes ADD COLUMN area numeric(10,2);
  END IF;
END $$;

-- Add coordinates field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_processes' AND column_name = 'coordinates'
  ) THEN
    ALTER TABLE license_processes ADD COLUMN coordinates text;
  END IF;
END $$;

-- Add environmental_impact field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_processes' AND column_name = 'environmental_impact'
  ) THEN
    ALTER TABLE license_processes ADD COLUMN environmental_impact text DEFAULT 'baixo';
  END IF;
END $$;

-- Add estimated_value field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_processes' AND column_name = 'estimated_value'
  ) THEN
    ALTER TABLE license_processes ADD COLUMN estimated_value numeric(15,2);
  END IF;
END $$;

-- Add comments to document fields
COMMENT ON COLUMN license_processes.location IS 'Full address and location description of the project';
COMMENT ON COLUMN license_processes.area IS 'Total area of the project in hectares';
COMMENT ON COLUMN license_processes.coordinates IS 'GPS coordinates (latitude, longitude) of the project location';
COMMENT ON COLUMN license_processes.environmental_impact IS 'Environmental impact assessment level: baixo, medio, alto';
COMMENT ON COLUMN license_processes.estimated_value IS 'Estimated investment value in Brazilian Reais (R$)';

-- Create index on environmental_impact for faster filtering
CREATE INDEX IF NOT EXISTS idx_license_processes_environmental_impact
ON license_processes(environmental_impact)
WHERE environmental_impact IS NOT NULL;
