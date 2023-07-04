<?php
require '../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;

header('Content-Type: application/json');
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'fetch':
        $file = $_GET['file'];
        $start = $_GET['start'] ?? 0;
        $length = $_GET['length'] ?? 10;
        $searchValue = $_GET['search']['value'] ?? '';
        $orderByColumn = isset($_GET['order'][0]['column']) ? (int)$_GET['order'][0]['column'] : null;
        $orderByDir = $_GET['order'][0]['dir'] ?? 'asc';

        if (file_exists($file)) {
            $spreadsheet = IOFactory::load($file);
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestRow();
            $highestColumn = $sheet->getHighestColumn();
            $headers = [];
            $data = [];

            // Fetch headers
            foreach (range('A', $highestColumn) as $col) {
                $headers[] = $sheet->getCell("{$col}1")->getValue();
            }

            // Fetch all data
            for ($row = 2; $row <= $highestRow; $row++) {
                $rowData = [];
                foreach (range('A', $highestColumn) as $col) {
                    $rowData[] = $sheet->getCell("{$col}{$row}")->getValue();
                }
                $data[] = $rowData;
            }

            // Search
            if ($searchValue) {
                $data = array_filter($data, function ($row) use ($searchValue) {
                    foreach ($row as $cell) {
                        if (stripos($cell, $searchValue) !== false) { // case-insensitive search
                            return true;
                        }
                    }
                    return false;
                });
                // Reset the array keys after filtering
                $data = array_values($data);
            }

            $recordsFiltered = count($data);

            // Order
            if ($orderByColumn !== null) {
                usort($data, function ($a, $b) use ($orderByColumn, $orderByDir) {
                    if ($orderByDir === 'asc') {
                        return $a[$orderByColumn] <=> $b[$orderByColumn];
                    } else {
                        return $b[$orderByColumn] <=> $a[$orderByColumn];
                    }
                });
            }

            // Pagination
            $data = array_slice($data, $start, $length);

            header('Content-Type: application/json');
            echo json_encode([
                "draw" => isset($_GET['draw']) ? intval($_GET['draw']) : 1,
                'recordsTotal' => $highestRow - 1,
                'recordsFiltered' => $recordsFiltered,
                'data' => $data,
                'headers' => $headers,
            ]);
        } else {
            echo json_encode(['status' => 'file not found']);
        }
        break;


    case 'files':
        $files = glob("../files/*.xlsx");
        $result = array();
        foreach ($files as $file) {
            $result[] = array(
                "path" => $file,
                "name" => basename($file)
            );
        }
        echo json_encode($result);
        break;
    case 'save':
        $data = json_decode(file_get_contents('php://input'), true);

        $file = $data['file'];
        $rowData = $data['data'];

        $lockFilePath = $file . '.lock';
        $lockFile = fopen($lockFilePath, "w");

        if (flock($lockFile, LOCK_EX)) { // Acquire an exclusive lock

            $spreadsheet = file_exists($file) ?
                IOFactory::load($file) :
                new Spreadsheet();

            $sheet = $spreadsheet->getActiveSheet();
            $nextRow = $sheet->getHighestRow() + 1;

            // Save data dynamically
            foreach ($rowData as $index => $value) {
                $colLetter = chr(65 + $index); // 65 is the ASCII code for 'A'
                $sheet->setCellValue("{$colLetter}{$nextRow}", $value);
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save($file);

            fflush($lockFile); // flush output before releasing the lock
            flock($lockFile, LOCK_UN); // Release the lock
        } else {
            echo "Could not lock the file!";
        }

        fclose($lockFile);

        echo json_encode(['status' => 'success']);
        break;
}
