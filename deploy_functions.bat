@echo off
echo ===================================================
echo     Nano Banana Studio - Deploy Edge Functions
echo ===================================================
echo.
echo Fazendo login no Supabase CLI...
npx supabase login
echo.
echo Fazendo deploy das 4 Edge Functions...
npx supabase functions deploy manage-api-credentials --project-ref dttgyctwfbennrsmodkn
npx supabase functions deploy generate-images --project-ref dttgyctwfbennrsmodkn
npx supabase functions deploy get-generation-status --project-ref dttgyctwfbennrsmodkn
npx supabase functions deploy delete-workflow --project-ref dttgyctwfbennrsmodkn
echo.
echo ===================================================
echo Deploy finalizado com sucesso!
echo ===================================================
pause

