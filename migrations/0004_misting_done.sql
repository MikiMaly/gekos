-- 0004_misting_done: explicitní záznam "rošeno" (done=1) vs "nerošeno" (done=0).
-- Z Telegramu si můžu kliknout 👍 (done=1) nebo 👎 (done=0) a oba stavy se
-- zapíšou do historie. Existující řádky dostanou done=1 (přes DEFAULT).
ALTER TABLE misting_events ADD COLUMN done INTEGER NOT NULL DEFAULT 1 CHECK(done IN (0,1));
