CREATE TABLE public.product_images(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_org_product_idx ON public.product_images(organization_id,product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_images FROM anon,authenticated;
GRANT ALL ON public.product_images TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('product-images','product-images',false,2097152,ARRAY['image/png','image/jpeg']) ON CONFLICT(id) DO NOTHING;
