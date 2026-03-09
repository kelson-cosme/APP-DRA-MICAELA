-- Adicionando a coluna image_position na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_position VARCHAR(50) DEFAULT 'center';
