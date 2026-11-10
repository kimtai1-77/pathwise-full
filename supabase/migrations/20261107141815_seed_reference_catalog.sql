--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: strategies; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.strategies (id, name, description, created_at) VALUES ('da598ff4-4f2d-482d-9b6c-27d12fd28b87', 'Application Control', 'Restrict execution of unapproved or malicious programs, including binaries, installers, executable files, scripts, and Java applications.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('efc3bd88-64b1-40c1-bc45-e2dc84b94457', 'Patch Applications', 'Patch applications (e.g., web browsers, PDF software, office productivity tools) to remediate security vulnerabilities within required timeframes.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('682a3df2-60e9-42cd-a71c-d6bd8385666f', 'User Application Hardening', 'Block dangerous features in web browsers, disable unneeded capabilities, and restrict user access to sensitive administrative settings.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('fa31367c-4028-49f5-bd70-45bfe5c140b9', 'Restrict Administrative Privileges', 'Restrict administrative privileges to system administrative tasks, conduct regular reviews of accounts, and prevent administrative accounts from accessing email and web.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('cd24ce3a-ca8c-4948-8675-94824be57c63', 'Patch Operating Systems', 'Patch operating systems for workstations, servers, and network devices to mitigate known vulnerabilities.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('5e16df1c-8db3-4322-b629-183c0115d53d', 'Multi-Factor Authentication', 'Enforce multi-factor authentication (MFA) for all users accessing sensitive data, cloud services, and remote access systems.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('c70721b2-818b-40ad-8fdf-d52509eb4a7d', 'Regular Backups', 'Perform regular backups of critical data, software, and configuration settings, ensuring backups are tested and stored securely offline or out-of-band.', '2026-10-16 15:50:37.41095+00');
INSERT INTO public.strategies (id, name, description, created_at) VALUES ('7d3bffb9-4b4a-42e9-9bf7-b6b6187cab31', 'Restrict Microsoft Office Macros', 'Block macros running from the internet and only allow vetted macros in trusted locations signed with digital signatures.', '2026-10-16 15:50:37.41095+00');


--
-- Data for Name: controls; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('0f13981c-9f2a-4f0e-8175-9c651774df7f', 'Patch Applications', 'Patches, updates or other vendor mitigations for vulnerabilities in office
productivity suites, web browsers and their extensions, email clients, PDF
software, and security products are applied within two weeks of release.', 1, 'PAT-ML1-07', 'ISM-1691', '2026-10-18 14:43:55.891981+00', '2026-10-18 14:43:55.891981+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('16edaadc-d043-4a9a-885e-1a2c4a925234', 'Patch Applications', 'Office productivity suites, web browsers and their extensions, email
clients, PDF software, Adobe Flash Player, and security products that are
no longer supported by vendors are removed. ', 1, 'PAT-ML1-09', 'ISM-1704', '2026-10-18 14:45:52.877859+00', '2026-10-18 14:45:52.877859+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('539dc053-17dc-41ab-b018-3ed9b4b42fe7', 'Patch Applications', 'A vulnerability scanner is used at least weekly to identify missing patches
or updates for vulnerabilities in office productivity suites, web browsers
and their extensions, email clients, PDF software, and security products.', 1, 'PAT-ML1-04', 'ISM-1699', '2026-10-18 14:41:03.026835+00', '2026-10-18 14:41:03.026835+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('7c1662fe-30a3-4354-ade4-e900750abba1', 'Patch Applications', 'Patches, updates or other vendor mitigations for vulnerabilities in online
services are applied within 48 hours of release when vulnerabilities are
assessed as critical by vendors or when working exploits exist.', 1, 'PAT-ML1-05', 'ISM-1876', '2026-10-18 14:42:18.411909+00', '2026-10-18 14:42:18.411909+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('a38f8132-3a8e-4a87-a81d-e4e01ab1876d', 'Patch Applications', 'A vulnerability scanner is used at least daily to identify missing patches or
updates for vulnerabilities in online services.', 1, 'PAT-ML1-03', 'ISM-1698', '2026-10-18 14:35:43.457126+00', '2026-10-18 14:35:43.457126+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('c66f4fda-192f-4b59-b180-2db1e58dd90a', 'Patch Applications', 'An automated method of asset discovery is used at least fortnightly to
support the detection of assets for subsequent vulnerability scanning
activities.', 1, 'PAT-ML1-01', 'ISM-1807', '2026-10-18 14:00:14.592364+00', '2026-10-18 14:00:14.592364+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e9f2e7fd-b19b-4aac-a550-d81dfdc57050', 'Patch Applications', 'Patches, updates or other vendor mitigations for vulnerabilities in online
services are applied within 48 hours of release when vulnerabilities are
assessed as critical by vendors or when working exploits exist.', 1, 'PAT-ML1-06', 'ISM-1690', '2026-10-18 14:43:05.022017+00', '2026-10-18 14:43:05.022017+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('fbfdb578-f89c-43d3-9f6a-79f890d6827e', 'Patch Applications', 'A vulnerability scanner with an up-to-date vulnerability database is used
for vulnerability scanning activities.', 1, 'PAT-ML1-02', 'ISM-1808', '2026-10-18 14:01:36.944669+00', '2026-10-18 14:01:36.944669+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('db3b25a8-24d7-4a1f-bad9-0e94021191a0', 'Patch Operating Systems', 'An automated method of asset discovery is used at least fortnightly to
support the detection of assets for subsequent vulnerability scanning
activities.', 1, 'POS-ML1-01', 'ISM-1807', '2026-10-18 15:06:21.292964+00', '2026-10-18 15:06:21.292964+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('cb4dda20-ae12-456d-b930-6c78bc78cc77', 'Patch Operating Systems', 'A vulnerability scanner with an up-to-date vulnerability database is used
for vulnerability scanning activities.', 1, 'POS-ML1-02', 'ISM-1808', '2026-10-18 15:08:13.524729+00', '2026-10-18 15:08:13.524729+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('67e8ba4e-b5b8-4e8c-8ead-a7f27d711806', 'Patch Operating Systems', 'A vulnerability scanner is used at least fortnightly to identify missing
patches or updates for vulnerabilities in operating systems of
workstations, non-internet-facing servers and non-internet-facing
network devices.', 1, 'POS-ML1-04', 'ISM-1702', '2026-10-18 15:55:09.293203+00', '2026-10-18 15:55:09.293203+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('3a1864f8-6227-4ce3-aa1b-0431836336f7', 'Patch Operating Systems', 'Patches, updates or other vendor mitigations for vulnerabilities in
operating systems of internet-facing servers and internet-facing network
devices are applied within 48 hours of release when vulnerabilities are
assessed as critical by vendors or when working exploits exist.', 1, 'POS-ML1-05', 'ISM-1877', '2026-10-18 15:55:43.636901+00', '2026-10-18 15:55:43.636901+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('b05be8cd-2f9f-4b2c-8ab0-44d39534bf6d', 'Patch Operating Systems', 'Patches, updates or other vendor mitigations for vulnerabilities in
operating systems of internet-facing servers and internet-facing network
devices are applied within two weeks of release when vulnerabilities are
assessed as non-critical by vendors and no working exploits exist.', 1, 'POS-ML1-06', 'ISM-1694', '2026-10-18 15:56:44.929546+00', '2026-10-18 15:56:44.929546+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('1b5f9638-84f8-49c2-b18b-5563513477c2', 'Patch Operating Systems', 'Patches, updates or other vendor mitigations for vulnerabilities in
operating systems of workstations, non-internet-facing servers and non-
internet-facing network devices are applied within one month of release.', 1, 'POS-ML1-07', 'ISM-1695', '2026-10-18 15:57:55.657847+00', '2026-10-18 15:57:55.657847+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('a47ba5a9-4d98-44cc-8c48-197a12584772', 'Patch Operating Systems', 'Operating systems that are no longer supported by vendors are replaced. ', 1, 'POS-ML1-08', 'ISM-1501', '2026-10-18 15:59:15.555324+00', '2026-10-18 15:59:15.555324+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('199506af-f1c4-4cd4-9aad-a56c50838968', 'Multi-Factor Authentication', 'Multi-factor authentication is used to authenticate users to their
organisation’s online services that process, store or communicate their
organisation’s sensitive data.', 1, 'MFA-ML1-01', 'ISM-1504', '2026-10-18 16:02:51.01553+00', '2026-10-18 16:02:51.01553+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e77694e3-2185-4034-9aa5-82a413b6f70a', 'Multi-Factor Authentication', 'Multi-factor authentication is used to authenticate users to third-party
online services that process, store or communicate their organisation’s
sensitive data.', 1, 'MFA-ML1-02', 'ISM-1679', '2026-10-18 16:03:32.303423+00', '2026-10-18 16:03:32.303423+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('33fbcb02-82e5-4089-ba3d-0e3531120d6e', 'Multi-Factor Authentication', 'Multi-factor authentication (where available) is used to authenticate
users to third-party online services that process, store or communicate
their organisation’s non-sensitive data.', 1, 'MFA-ML1-03', 'ISM-1680', '2026-10-18 16:04:12.511099+00', '2026-10-18 16:04:12.511099+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('2b16f6b9-7b8d-40f9-839b-5c3ae52d466a', 'Multi-Factor Authentication', 'Multi-factor authentication is used to authenticate users to their
organisation’s online customer services that process, store or
communicate their organisation’s sensitive customer data.', 1, 'MFA-ML1-04', 'ISM-1892', '2026-10-18 16:04:52.140314+00', '2026-10-18 16:04:52.140314+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('549c5e2e-4399-47dc-b8a3-d4f48c95791f', 'Multi-Factor Authentication', 'Multi-factor authentication is used to authenticate users to third-party
online customer services that process, store or communicate their
organisation’s sensitive customer data.', 1, 'MFA-ML1-05', 'ISM-1893', '2026-10-18 16:05:29.752446+00', '2026-10-18 16:05:29.752446+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('0f968ca9-e433-455f-a606-905fed14bf91', 'Multi-Factor Authentication', 'Multi-factor authentication is used to authenticate customers to online
customer services that process, store or communicate sensitive customer
data.', 1, 'MFA-ML1-06', 'ISM-1681', '2026-10-18 16:06:02.830402+00', '2026-10-18 16:06:02.830402+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e5b26679-0bd8-4358-a70b-5ce716621000', 'Multi-Factor Authentication', 'Multi-factor authentication uses either: something users have and
something users know, or something users have that is unlocked by
something users know or are.', 1, 'MFA-ML1-07', 'ISM-1401', '2026-10-18 16:06:32.285518+00', '2026-10-18 16:06:32.285518+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('10231a28-71ef-435d-b51a-0bbb1d154aba', 'Restrict Administrative Privileges', 'Requests for privileged access to systems, applications and data
repositories are validated when first requested.', 1, 'RAP-ML1-01', 'ISM-1507', '2026-10-18 16:18:06.435795+00', '2026-10-18 16:18:06.435795+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('7ad38960-1ac3-4063-a233-b3b29c5cf48d', 'Restrict Administrative Privileges', 'Privileged users are assigned a dedicated privileged user account to be
used solely for duties requiring privileged access.', 1, 'RAP-ML1-02', 'ISM-0445', '2026-10-18 16:19:22.940517+00', '2026-10-18 16:19:22.940517+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e7e29654-1749-41c0-85be-f487426c1d18', 'Restrict Administrative Privileges', 'Privileged user accounts (excluding those explicitly authorised to access
online services) are prevented from accessing the internet, email and
web services.', 1, 'RAP-ML1-03', 'ISM-1175', '2026-10-18 16:19:57.048406+00', '2026-10-18 16:19:57.048406+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('05586268-94e1-48d3-bf9c-cb22d644054a', 'Restrict Administrative Privileges', 'Privileged user accounts explicitly authorised to access online services are
strictly limited to only what is required for users and services to
undertake their duties.', 1, 'RAP-ML1-04', 'ISM-1883', '2026-10-18 16:21:05.298568+00', '2026-10-18 16:21:05.298568+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('b06e1ca1-794b-4ffe-8d91-a22255b0b2c9', 'Restrict Administrative Privileges', 'Privileged users use separate privileged and unprivileged operating
environments.', 1, 'RAP-ML1-05', 'ISM-1380', '2026-10-18 16:21:55.24269+00', '2026-10-18 16:21:55.24269+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e51c41f0-9a6f-403e-b360-74367287aa22', 'Restrict Administrative Privileges', 'Unprivileged user accounts cannot logon to privileged operating
environments.', 1, 'RAP-ML1-06', 'ISM-1688', '2026-10-18 16:22:33.019281+00', '2026-10-18 16:22:33.019281+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('f5d4a06e-b422-4423-a06a-35cda2015d40', 'Restrict Administrative Privileges', 'Privileged user accounts (excluding local administrator accounts) cannot
logon to unprivileged operating environments.', 1, 'RAP-ML1-07', 'ISM-1689', '2026-10-18 16:23:35.139901+00', '2026-10-18 16:23:35.139901+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('963396ab-e988-462b-9cdc-559b46c93984', 'Application Control', 'Application control is implemented on workstations. ', 1, 'AC-ML1-01', 'ISM-0843', '2026-10-18 16:26:05.369574+00', '2026-10-18 16:26:05.369574+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('fc882c32-79b5-4449-a799-428932d468ee', 'Application Control', 'Application control is applied to user profiles and temporary folders used
by operating systems, web browsers and email clients.', 1, 'AC-ML1-02', 'ISM-1870', '2026-10-18 16:27:07.37858+00', '2026-10-18 16:27:07.37858+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('ba04cb8e-7494-4a2d-8acd-63666606dab8', 'Application Control', 'Application control restricts the execution of executables, software
libraries, scripts, installers, compiled HTML, HTML applications and
control panel applets to an organisation-approved set.', 1, 'AC-ML1-03', 'ISM-1657', '2026-10-18 16:27:50.554542+00', '2026-10-18 16:27:50.554542+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('51950c64-b08a-4987-98a7-ecc8329123fd', 'Restrict Microsoft Office Macros', 'Microsoft Office macros are disabled for users that do not have a
demonstrated business requirement.', 1, 'MAC-ML1-01', 'ISM-1671', '2026-10-18 16:35:53.81613+00', '2026-10-18 16:35:53.81613+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('c4c0ace3-3add-4dfe-bf57-8852cb13fc31', 'Restrict Microsoft Office Macros', 'Microsoft Office macros in files originating from the internet are blocked. ', 1, 'MAC-ML1-02', 'ISM-1488', '2026-10-18 16:36:30.349005+00', '2026-10-18 16:36:30.349005+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('1d4b0b9c-940e-446b-8cd7-d60a8bbdeb44', 'Restrict Microsoft Office Macros', 'Microsoft Office macro antivirus scanning is enabled.  ', 1, 'MAC-ML1-03', 'ISM-1672', '2026-10-18 16:37:12.926434+00', '2026-10-18 16:37:12.926434+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('9d884360-9583-432b-a2dd-f03bec2ae827', 'Restrict Microsoft Office Macros', 'Microsoft Office macro security settings cannot be changed by users.   ', 1, 'MAC-ML1-04', 'ISM-1489', '2026-10-18 16:37:44.11052+00', '2026-10-18 16:37:44.11052+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('9680068d-d69c-44e3-90ff-03d473dd11df', 'User Application Hardening', 'Internet Explorer 11 is disabled or removed.    ', 1, 'UAH-ML1-01', 'ISM-1654', '2026-10-18 16:41:14.890065+00', '2026-10-18 16:41:14.890065+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('e6158b79-4ed5-459c-9b24-46753c8651c3', 'User Application Hardening', 'Web browsers do not process Java from the internet.', 1, 'UAH-ML1-02', 'ISM-1486', '2026-10-18 16:42:04.694268+00', '2026-10-18 16:42:04.694268+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('30e00ba0-8b1b-41f9-94c0-6dba6cfbf552', 'User Application Hardening', 'Web browsers do not process web advertisements from the internet. ', 1, 'UAH-ML1-03', 'ISM-1485', '2026-10-18 16:42:46.715654+00', '2026-10-18 16:42:46.715654+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('7131fc5e-00be-449c-a421-f4943d1b42e3', 'User Application Hardening', 'Web browser security settings cannot be changed by users.', 1, 'UAH-ML1-04', 'ISM-1585', '2026-10-18 16:43:25.063748+00', '2026-10-18 16:43:25.063748+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('373d727a-1e4a-48d4-91a4-045a0eceb3ad', 'Regular Backups', 'Backups of data, applications and settings are performed and retained in
accordance with business criticality and business continuity
requirements.', 1, 'BAK-ML1-01', 'ISM-1511', '2026-10-18 16:46:04.664576+00', '2026-10-18 16:46:04.664576+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('3b99dacf-b0ca-4053-8501-15f7459c6921', 'Regular Backups', 'Backups of data, applications and settings are synchronised to enable
restoration to a common point in time.', 1, 'BAK-ML1-02', 'ISM-1810', '2026-10-18 16:46:44.245283+00', '2026-10-18 16:46:44.245283+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('37b8b903-9e54-4535-b0a6-f7a10606dd59', 'Regular Backups', 'Backups of data, applications and settings are retained in a secure and
resilient manner.', 1, 'BAK-ML1-03', 'ISM-1811', '2026-10-18 16:47:21.698099+00', '2026-10-18 16:47:21.698099+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('60055f5d-e043-4cc2-bf41-a873b8896666', 'Regular Backups', 'Restoration of data, applications and settings from backups to a common
point in time is tested as part of disaster recovery exercises.', 1, 'BAK-ML1-04', 'ISM-1515', '2026-10-18 16:49:16.287539+00', '2026-10-18 16:49:16.287539+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('ffbebc7d-0c42-43bb-be6e-d3f750e36e0d', 'Regular Backups', 'Unprivileged user accounts cannot access backups belonging to other
user accounts.', 1, 'BAK-ML1-05', 'ISM-1812', '2026-10-18 16:49:52.577956+00', '2026-10-18 16:49:52.577956+00');
INSERT INTO public.controls (id, strategy, name, maturity_level, control_code, ism_id, created_at, updated_at) VALUES ('723285f2-b12b-441a-8920-9f4a520f70e6', 'Regular Backups', 'Unprivileged user accounts are prevented from modifying and deleting
backups.', 1, 'BAK-ML1-06', 'ISM-1814', '2026-10-18 16:50:36.316709+00', '2026-10-18 16:50:36.316709+00');


--
-- PostgreSQL database dump complete
--


