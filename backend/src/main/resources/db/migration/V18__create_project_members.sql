CREATE TABLE public.project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES public.project_opportunities(id) ON DELETE CASCADE,
    talent_id   UUID NOT NULL REFERENCES public.talent_profiles(id)       ON DELETE CASCADE,
    role        VARCHAR(100),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, talent_id)
);
