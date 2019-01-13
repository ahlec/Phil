-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               PostgreSQL 9.6.5, compiled by Visual C++ build 1800, 64-bit
-- Server OS:
-- HeidiSQL Version:             9.5.0.5295
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES  */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping data for table public.schemaversion: 0 rows
/*!40000 ALTER TABLE "schemaversion" DISABLE KEYS */;
REPLACE INTO "schemaversion" ("version", "name", "md5", "run_at") VALUES
	(0, NULL, NULL, NULL),
	(1, E'initial', E'f8a2a8c384ff7a9d57c0cafe843ae1de', E'2019-01-12 19:56:00.953-08'),
	(2, E'has-reminded-channel', E'adf8472e32d70e9aa59a6aef74922e84', E'2019-01-12 19:56:00.955-08'),
	(3, E'birthdays', E'75478277e109c60b841a272b691cb408', E'2019-01-12 19:56:00.956-08'),
	(4, E'booty-day-reminder', E'796624ffb96d7a15404b78be818af9be', E'2019-01-12 19:56:00.957-08'),
	(5, E'timezones', E'97e0c0b56d47cb3e6360b1fbec9f5b7f', E'2019-01-12 19:56:00.958-08'),
	(6, E'prompt-buckets', E'2487baf59077ec03c899218a078b5e7c', E'2019-01-12 19:56:00.959-08'),
	(7, E'server-based-requestables', E'140d7f7cc98c4b7f76c23c20f846bd1c', E'2019-01-12 19:56:00.96-08'),
	(8, E'server-specific-tables', E'f49a12830c12b2868913760c8ccfef33', E'2019-01-12 19:56:00.961-08');
/*!40000 ALTER TABLE "schemaversion" ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
