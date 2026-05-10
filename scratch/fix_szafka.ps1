$path = "h:/Nowy folder/htdocs/korpuspro2/korpuspro/src/components/3D/Szafka3D.tsx"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$c = $c.Replace(' FOO>', '>')
$c = $c.Replace('Ä…', 'ą').Replace('Ĺ‚', 'ł').Replace('Ăł', 'ó').Replace('Ĺ„', 'ń').Replace('Ä™', 'ę').Replace('Ĺ›', 'ś').Replace('Ĺş', 'ź').Replace('ĹĽ', 'ż').Replace('Ä‡', 'ć')
[System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
