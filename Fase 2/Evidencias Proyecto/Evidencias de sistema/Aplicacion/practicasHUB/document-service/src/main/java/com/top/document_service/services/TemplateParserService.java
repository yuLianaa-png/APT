package com.top.document_service.services;

import com.top.document_service.DTO.ParsedTemplateDTO;
import com.top.document_service.DTO.TemplateItemDTO;
import com.top.document_service.DTO.TemplateSectionDTO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Lee una plantilla de evaluacion y arma un BORRADOR de pauta. No es infalible - el docente siempre revisa el borrador en el editor antes de publicarlo.
@Service
public class TemplateParserService {
    public static final long MAX_SIZE = 5L * 1024 * 1024;
    private static final int MAX_SECTIONS = 10;
    private static final int MAX_ITEMS = 40;
    private static final int MAX_LABEL = 500;
    private static final int MAX_INSTRUCTIONS = 3000;
    private static final int MAX_ROWS = 3000;
    private static final int MIN_PDF_TEXT = 40;

    private static final Pattern LETTERS = Pattern.compile("\\p{L}.*\\p{L}.*\\p{L}", Pattern.DOTALL);
    private static final Pattern HEADING = Pattern.compile("^\\s*\\d{1,2}\\s*[.)\\-]\\s*(.+)$", Pattern.DOTALL);
    private static final Pattern CLOSING = Pattern.compile(
            "(?i)^\\s*(calificaci[oó]n|nota\\s+final|nota\\s+obtenida|promedio|puntaje\\s+total|total)\\b");
    private static final Pattern INSTRUCTION = Pattern.compile("(?i)^\\s*(marque|seleccione|indique|escala\\s*:|evalúe|evalue)");
    private static final Pattern CALCULATED = Pattern.compile("(?i)(autocomplet|se\\s+calcula|calculad[oa]\\s+autom)");
    private static final Pattern TEXT_FIELD = Pattern.compile(
            "(?i)^\\s*(observaciones?|comentarios?|sugerencias?|fortalezas|aspectos\\s+a\\s+mejorar|recomendaciones?)\\b");
    private static final Pattern NUMBER = Pattern.compile("^\\s*(\\d{1,2})(?:[.,]0+)?\\s*$");
    private static final Pattern PDF_SCALE = Pattern.compile("(?:^|\\D)1\\s+2\\s+3\\s+4\\s+5\\s+6\\s+7(\\s+8\\s+9\\s+10)?(?:\\D|$)");
    private static final Pattern WEIGHT_HEADER = Pattern.compile("(?i)(ponderaci|peso|^\\s*%\\s*$)");
    private static final Pattern CELL_REF = Pattern.compile("\\$?([A-Z]{1,3})\\$?(\\d{1,7})");
    private static final List<String> CONCEPTS = List.of(
            "excelente", "muy bueno", "bueno", "suficiente", "regular", "insuficiente", "deficiente", "malo", "logrado");

//modelo interno
    private static class CellData {
        String text = "";
        String formula;
        String address;
        int column;
    }

    private static class RowData {
        List<CellData> cells = new ArrayList<>();
    }

    private static class Item {
        TemplateItemDTO dto;
        int rowIndex;
        List<String> refs = new ArrayList<>();
    }

    private static class Table {
        String title;
        String headerLabel;
        int scale;
        Integer weightColumn;
        int slots;
        String closingLabel;
        String resultAddress;
        List<Item> items = new ArrayList<>();
    }

//entrada
    public ParsedTemplateDTO parse(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío.");
        if (file.getSize() > MAX_SIZE) throw new IllegalArgumentException("La plantilla no puede superar los 5 MB.");

        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo.");
        }

        //se revisa el contenido real del archivo, no solo la extension
        boolean zip = bytes.length > 4 && bytes[0] == 'P' && bytes[1] == 'K' && bytes[2] == 3 && bytes[3] == 4;
        boolean pdf = bytes.length > 4 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';

        try {
            switch (extension) {
                case "xlsx":
                    if (!zip) throw new IllegalArgumentException("El archivo no es un Excel (.xlsx) válido.");
                    return build(readExcel(bytes), "EXCEL");
                case "docx":
                    if (!zip) throw new IllegalArgumentException("El archivo no es un Word (.docx) válido.");
                    return build(readWord(bytes), "WORD");
                case "pdf":
                    if (!pdf) throw new IllegalArgumentException("El archivo no es un PDF válido.");
                    return build(readPdf(bytes), "PDF");
                default:
                    throw new IllegalArgumentException(
                            "Formato no permitido. Sube la plantilla en Excel (.xlsx), Word (.docx) o PDF con texto.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("No se pudo leer la plantilla: " + e.getMessage());
            throw new IllegalArgumentException("No se pudo leer la plantilla. Revisa que el archivo no esté dañado o protegido con contraseña.");
        }
    }

//formatos
    private List<RowData> readExcel(byte[] bytes) throws IOException {
        List<RowData> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter(Locale.forLanguageTag("es-CL"));
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                if (workbook.isSheetHidden(s) || workbook.isSheetVeryHidden(s)) continue;
                Sheet sheet = workbook.getSheetAt(s);
                int last = Math.min(sheet.getLastRowNum(), MAX_ROWS);
                for (int r = 0; r <= last; r++) {
                    RowData data = new RowData();
                    Row row = sheet.getRow(r);
                    if (row != null) {
                        for (Cell cell : row) {
                            CellData c = new CellData();
                            c.column = cell.getColumnIndex();
                            c.address = cell.getAddress().formatAsString();
                            if (cell.getCellType() == CellType.FORMULA) {
                                //el resultado de una formula no es texto de la plantilla
                                c.formula = cell.getCellFormula();
                            } else {
                                c.text = clean(formatter.formatCellValue(cell));
                            }
                            if (!c.text.isEmpty() || c.formula != null) data.cells.add(c);
                        }
                    }
                    rows.add(data);
                }
                rows.add(new RowData());
            }
        }
        return rows;
    }

    private List<RowData> readWord(byte[] bytes) throws IOException {
        List<RowData> rows = new ArrayList<>();
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            for (IBodyElement element : document.getBodyElements()) {
                if (rows.size() > MAX_ROWS) break;
                if (element instanceof XWPFParagraph paragraph) {
                    rows.add(single(paragraph.getText()));
                } else if (element instanceof XWPFTable table) {
                    for (XWPFTableRow tableRow : table.getRows()) {
                        RowData data = new RowData();
                        int column = 0;
                        for (XWPFTableCell cell : tableRow.getTableCells()) {
                            CellData c = new CellData();
                            c.column = column++;
                            c.text = clean(cell.getText());
                            data.cells.add(c);
                        }
                        rows.add(data);
                    }
                    rows.add(new RowData());
                }
            }
        }
        return rows;
    }

    private List<RowData> readPdf(byte[] bytes) throws IOException {
        List<RowData> rows = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            if (text == null || text.replaceAll("\\s", "").length() < MIN_PDF_TEXT) {
                throw new IllegalArgumentException("Este PDF parece escaneado (no trae texto). "
                        + "Súbelo en Excel, Word o como PDF con texto, o crea la pauta a mano.");
            }
            for (String line : text.split("\\R")) {
                if (rows.size() > MAX_ROWS) break;
                rows.add(line.isBlank() ? new RowData() : single(line));
            }
        }
        return rows;
    }

//analisis
    private ParsedTemplateDTO build(List<RowData> rows, String format) {
        ParsedTemplateDTO result = new ParsedTemplateDTO();
        result.setSourceFormat(format);
        List<Table> tables = new ArrayList<>();
        List<String> textFields = new ArrayList<>();
        String instructions = null;
        Table current = null;
        int emptyRun = 0;

        for (int i = 0; i < rows.size(); i++) {
            RowData row = rows.get(i);
            if (row.cells.isEmpty()) {
                //en el PDF las lineas en blanco separan parrafos, no cierran la tabla
                if (current != null && !"PDF".equals(format) && ++emptyRun >= 3) current = null;
                continue;
            }
            emptyRun = 0;
            String label = label(row);
            Table header = header(row);

            if (header != null) {
                header.headerLabel = label == null ? null : stripScale(label);
                header.title = title(rows, i, current);
                if (header.title == null) header.title = "Sección " + (tables.size() + 1);
                tables.add(header);
                current = header;
                continue;
            }

            if (current == null) {
                if (label == null) continue;
                if (tables.isEmpty() && label.length() >= 150) {
                    if (instructions == null || label.length() > instructions.length()) instructions = label;
                } else if (!tables.isEmpty() && TEXT_FIELD.matcher(label).find() && label.length() <= 150) {
                    textFields.add(stripColon(label));
                }
                continue;
            }

            //dentro de una tabla de notas
            if (label != null && label.length() <= 150 && CLOSING.matcher(label).find()) {
                current.closingLabel = label;
                current.resultAddress = resultAddress(row, label);
                current = null;
                continue;
            }
            if (label == null) {
                current.slots++;
                continue;
            }
            if (INSTRUCTION.matcher(label).find()) continue;

            //PDF - una linea que empieza en minuscula sigue al criterio anterior
            if ("PDF".equals(format) && Character.isLowerCase(label.charAt(0)) && !current.items.isEmpty()) {
                Item previous = current.items.get(current.items.size() - 1);
                previous.dto.setLabel(limit(previous.dto.getLabel() + " " + label, MAX_LABEL));
                continue;
            }

            Item item = new Item();
            item.rowIndex = i;
            item.dto = new TemplateItemDTO();
            item.dto.setLabel(limit(stripColon(stripScale(label)), MAX_LABEL));
            if (anyText(row, CALCULATED)) {
                item.dto.setType("CALCULADO");
                for (CellData cell : row.cells) {
                    if (cell.formula == null) continue;
                    Matcher m = CELL_REF.matcher(cell.formula);
                    while (m.find()) item.refs.add(m.group(1) + m.group(2));
                }
            } else if (TEXT_FIELD.matcher(label).find()) {
                item.dto.setType("TEXTO");
            } else {
                item.dto.setType("NOTA");
                item.dto.setWeight(weight(row, current.weightColumn));
            }
            current.items.add(item);
        }

        if (tables.isEmpty()) {
            throw new IllegalArgumentException("No encontramos en el archivo una tabla de criterios con notas "
                    + "(por ejemplo, columnas de 1 a 7). Revisa la plantilla o crea la pauta a mano.");
        }

        assemble(result, tables, textFields, instructions, format);
        return result;
    }

    private void assemble(ParsedTemplateDTO result, List<Table> tables, List<String> textFields,
                          String instructions, String format) {
        List<String> warnings = result.getWarnings();
        result.setInstructions(instructions == null ? null : limit(instructions, MAX_INSTRUCTIONS));

        //se descartan tablas vacias
        List<Table> kept = new ArrayList<>();
        for (Table table : tables) {
            if (table.items.isEmpty() && table.slots == 0) continue;
            kept.add(table);
        }
        if (kept.isEmpty()) {
            throw new IllegalArgumentException("Encontramos la tabla de notas, pero no sus criterios. Crea la pauta a mano.");
        }
        if (kept.size() > MAX_SECTIONS) {
            warnings.add("La plantilla tiene más de " + MAX_SECTIONS + " tablas: solo se usaron las primeras.");
            kept = kept.subList(0, MAX_SECTIONS);
        }

        //de que seccion sale cada criterio calculado
        Map<String, Integer> resultCells = new HashMap<>();
        for (int t = 0; t < kept.size(); t++) {
            if (kept.get(t).resultAddress != null) resultCells.put(kept.get(t).resultAddress, t);
        }
        Set<Integer> sources = new HashSet<>();
        for (int t = 0; t < kept.size(); t++) {
            for (Item item : kept.get(t).items) {
                if (!"CALCULADO".equals(item.dto.getType())) continue;
                Integer source = null;
                for (String ref : item.refs) {
                    if (resultCells.containsKey(ref) && resultCells.get(ref) != t) source = resultCells.get(ref);
                }
                if (source == null) {
                    source = t + 1 < kept.size() ? t + 1 : (t > 0 ? t - 1 : null);
                    warnings.add("Revisa de qué sección sale el promedio de «" + shortLabel(item.dto.getLabel()) + "».");
                }
                if (source == null) {
                    item.dto.setType("NOTA");
                } else {
                    item.dto.setSourceSection(source);
                    sources.add(source);
                }
            }
        }

        boolean anyFinal = kept.stream().anyMatch(t -> t.closingLabel != null
                && t.closingLabel.toLowerCase(Locale.ROOT).contains("final"));
        int scale = 7;
        int totalItems = 0;
        for (int t = 0; t < kept.size(); t++) {
            Table table = kept.get(t);
            TemplateSectionDTO section = new TemplateSectionDTO();
            section.setTitle(limit(table.title, 150));
            boolean isFinal = table.closingLabel != null && table.closingLabel.toLowerCase(Locale.ROOT).contains("final");
            section.setCountsForFinal(anyFinal ? isFinal : !sources.contains(t));

            for (Item item : table.items) {
                if (totalItems >= MAX_ITEMS) break;
                section.getItems().add(item.dto);
                totalItems++;
            }
            if (table.slots > 0) {
                TemplateItemDTO activities = new TemplateItemDTO();
                activities.setType("ACTIVIDADES");
                activities.setLabel("Actividades realizadas por el estudiante");
                activities.setMinActivities(1);
                section.getItems().add(activities);
            }

            double weights = section.getItems().stream().filter(i -> i.getWeight() != null).mapToDouble(TemplateItemDTO::getWeight).sum();
            if (weights > 0 && Math.abs(weights - 100) > 0.01) {
                warnings.add("Las ponderaciones de «" + shortLabel(section.getTitle()) + "» suman " + round(weights) + " %, no 100 %.");
            }
            if (table.scale != 7) scale = table.scale;
            result.getSections().add(section);
        }
        if (totalItems >= MAX_ITEMS) warnings.add("La pauta tiene más de " + MAX_ITEMS + " criterios: solo se usaron los primeros.");

        if (!textFields.isEmpty()) {
            TemplateSectionDTO comments = new TemplateSectionDTO();
            comments.setTitle("Comentarios del supervisor");
            comments.setCountsForFinal(false);
            for (String field : textFields.subList(0, Math.min(textFields.size(), 5))) {
                TemplateItemDTO text = new TemplateItemDTO();
                text.setType("TEXTO");
                text.setLabel(limit(field, MAX_LABEL));
                comments.getItems().add(text);
            }
            result.getSections().add(comments);
        }

        result.setDetectedScale(scale);
        if (scale == 10) warnings.add("La plantilla usa notas de 1 a 10. En PrácticasHub se evalúa de 1 a 7.");
        if (scale == 0) warnings.add("La plantilla usa conceptos (Excelente, Bueno...). En PrácticasHub se evalúa con notas de 1 a 7.");
        if ("PDF".equals(format)) {
            warnings.add("Los PDF no guardan la forma de las tablas: revisa con cuidado los criterios. "
                    + "Si la pauta pide que el supervisor escriba sus actividades, agrega un bloque de actividades.");
        }
        if (result.getInstructions() == null) warnings.add("No encontramos instrucciones para el supervisor; puedes escribirlas en el editor.");
    }

//ayudantes
    //encabezado de una tabla de notas, o null
    private Table header(RowData row) {
        Set<Integer> numbers = new HashSet<>();
        Integer weightColumn = null;
        int concepts = 0;
        for (CellData cell : row.cells) {
            Matcher m = NUMBER.matcher(cell.text);
            if (m.matches()) numbers.add(Integer.parseInt(m.group(1)));
            if (WEIGHT_HEADER.matcher(cell.text).find() && cell.text.length() < 30) weightColumn = cell.column;
            String lower = cell.text.toLowerCase(Locale.ROOT);
            for (String concept : CONCEPTS) if (lower.equals(concept) || lower.startsWith(concept + " ")) concepts++;
        }

        Table table = new Table();
        table.weightColumn = weightColumn;
        boolean oneToSeven = numbers.containsAll(Set.of(1, 2, 3, 4, 5, 6, 7));
        if (oneToSeven) {
            table.scale = numbers.contains(10) ? 10 : 7;
            return table;
        }
        //PDF - los numeros vienen en la misma linea que el titulo de la columna
        if (row.cells.size() == 1) {
            Matcher m = PDF_SCALE.matcher(row.cells.get(0).text);
            if (m.find()) {
                table.scale = m.group(1) != null ? 10 : 7;
                return table;
            }
        }
        if (concepts >= 3) {
            table.scale = 0;
            return table;
        }
        return null;
    }

    //titulo de una tabla - el encabezado numerado mas cercano arriba
    private String title(List<RowData> rows, int headerIndex, Table previous) {
        String fallback = null;
        int seen = 0;
        for (int i = headerIndex - 1; i >= 0 && seen < 4; i--) {
            String label = label(rows.get(i));
            if (label == null) continue;
            seen++;
            if (INSTRUCTION.matcher(label).find() || label.length() > 150) continue;
            Matcher m = HEADING.matcher(label);
            if (m.matches()) {
                dropItemAt(previous, i);
                return clean(m.group(1).replace("*", ""));
            }
            if (fallback == null && !CLOSING.matcher(label).find()) {
                dropItemAt(previous, i);
                fallback = clean(label.replace("*", ""));
            }
        }
        return fallback;
    }

    //si el titulo se habia tomado como criterio de la tabla anterior, se quita de ahi
    private void dropItemAt(Table table, int rowIndex) {
        if (table != null) table.items.removeIf(item -> item.rowIndex == rowIndex);
    }

    //primera celda con texto de verdad (al menos tres letras); una "X" o un numero no son etiqueta
    private String label(RowData row) {
        for (CellData cell : row.cells) {
            if (LETTERS.matcher(cell.text).find()) return cell.text;
        }
        return null;
    }

    //celda con el resultado en la fila de cierre (para saber que criterio calculado la usa)
    private String resultAddress(RowData row, String label) {
        boolean afterLabel = false;
        for (CellData cell : row.cells) {
            if (!afterLabel) {
                afterLabel = label.equals(cell.text);
                continue;
            }
            if (cell.address != null) return cell.address;
        }
        return null;
    }

    private boolean anyText(RowData row, Pattern pattern) {
        return row.cells.stream().anyMatch(cell -> pattern.matcher(cell.text).find());
    }

    private Double weight(RowData row, Integer column) {
        if (column == null) return null;
        for (CellData cell : row.cells) {
            if (cell.column != column) continue;
            String value = cell.text.replace("%", "").replace(',', '.').trim();
            try {
                double number = Double.parseDouble(value);
                //"0,25" en vez de "25 %"
                return number > 0 && number <= 1 ? round(number * 100) : round(number);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static RowData single(String text) {
        RowData row = new RowData();
        String cleaned = clean(text);
        if (!cleaned.isEmpty()) {
            CellData cell = new CellData();
            cell.text = cleaned;
            row.cells.add(cell);
        }
        return row;
    }

    //los numeros de la escala que quedan pegados al texto en el PDF
    private static String stripScale(String text) {
        return clean(PDF_SCALE.matcher(text).replaceAll(" ").replaceAll("(?i)\\bnota\\s*$", ""));
    }

    private static String stripColon(String text) {
        return text.endsWith(":") ? text.substring(0, text.length() - 1).trim() : text;
    }

    private static String clean(String text) {
        if (text == null) return "";
        return text.replace(' ', ' ')
                .replaceAll("[ \\t]+", " ")
                .replaceAll(" *\\R *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private static String limit(String text, int max) {
        if (text == null) return null;
        return text.length() <= max ? text : text.substring(0, max - 1).trim() + "…";
    }

    private static String shortLabel(String text) {
        return limit(text == null ? "" : text.replace('\n', ' '), 60);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
