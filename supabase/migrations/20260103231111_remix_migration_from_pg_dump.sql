CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: generation_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_id uuid,
    shot_id integer NOT NULL,
    shot_data jsonb NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    image_path text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT generation_queue_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'generating'::text, 'success'::text, 'error'::text])))
);


--
-- Name: packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_name text NOT NULL,
    pack_id text NOT NULL,
    pack_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid
);


--
-- Name: generation_queue generation_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_queue
    ADD CONSTRAINT generation_queue_pkey PRIMARY KEY (id);


--
-- Name: packs packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packs
    ADD CONSTRAINT packs_pkey PRIMARY KEY (id);


--
-- Name: idx_generation_queue_pack_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_queue_pack_id ON public.generation_queue USING btree (pack_id);


--
-- Name: idx_generation_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_queue_status ON public.generation_queue USING btree (status);


--
-- Name: generation_queue update_generation_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_generation_queue_updated_at BEFORE UPDATE ON public.generation_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: generation_queue generation_queue_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_queue
    ADD CONSTRAINT generation_queue_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.packs(id) ON DELETE CASCADE;


--
-- Name: generation_queue generation_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_queue
    ADD CONSTRAINT generation_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: packs packs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packs
    ADD CONSTRAINT packs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: packs Users can delete their own packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own packs" ON public.packs FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: generation_queue Users can delete their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own queue items" ON public.generation_queue FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: packs Users can insert their own packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own packs" ON public.packs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: generation_queue Users can insert their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own queue items" ON public.generation_queue FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: packs Users can update their own packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own packs" ON public.packs FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: generation_queue Users can update their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own queue items" ON public.generation_queue FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: packs Users can view their own packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own packs" ON public.packs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: generation_queue Users can view their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own queue items" ON public.generation_queue FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: generation_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: packs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;