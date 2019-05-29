'use strict';
//This was really helpful: https://github.com/tableaumagic/tableau-datatables-extension/blob/master/public/js/index.js
// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function () {
            const worksheet = tableau.extensions.dashboardContent.dashboard.worksheets.find(w => w.name === "Sheet 1");
            function refreshData(w) {
                let data = w.getUnderlyingDataAsync({includeAllColumns: true}).then(function (underlying) {
                    let columns = underlying.columns;
                    let data = underlying.data;
                    //convert to field:values convention
                    //Got this method from here: https://interworks.com/blog/rrouse/2016/06/07/pull-viz-data-new-javascript-api-features-tableau-10/
                    //The map() method creates a new array with the results of calling a provided function on every element in the calling array.
                    function reduceToObjects(cols, data) {
                        let fieldNameMap = $.map(cols, function (col) {
                            return col.fieldName;
                        });
                        let dataToReturn = $.map(data, function (d) {
                            return d.reduce(function (memo, value, idx) {
                                memo[fieldNameMap[idx]] = value.formattedValue;
                                return memo;
                            }, {});
                        });
                        return dataToReturn;
                    }
                    return reduceToObjects(columns, data);
                });
                return data;
            }

            refreshData(worksheet).then(function(finaldata){
                const table = $('#datatable').DataTable({
                    dom: 'Bfrtip', //shows where to display each element on page
                    data: finaldata,
                    columns: [
                        {
                            className: "details-control",
                            orderable: false,
                            data: null,
                            defaultContent: ""
                        },
                        {
                            data: "PTN_CHART",
                            width: "75px"
                        },
                        {data: "PHYSICIAN_ASSESSMENT_DT"},
                        {data: "CTAS"},
                        {data: "DISP_GROUP"},
                        {data: "DIAGNOSIS_DESCRIPTION"},
                        {
                            orderable: false,
                            render: function (data, type, row, meta) {
                                var imgsrc = 'alert.png';
                                return '<img src="alert.png" alt="Alert" height="16" width="16">;
                            },
                            defaultContent: ""
                        }
                    ],
                    order: [[2, "desc"]],
                    pageLength: 15,
                    buttons: [
                         {
                            text: 'Show All Visits',
                            action: function (e, dt, node, config) {
                                worksheet.clearFilterAsync("READMIT_VISIT")
                                .then(refreshData(worksheet)
                                .then(function(finaldata){
                                    table.clear();
                                    table.rows.add(finaldata);
                                    table.order([3, 'asc']).draw()
                                }))
                            }
                        },
                        {
                            text: 'Readmissions',
                            action: function (e, dt, node, config) {
                                worksheet.applyFilterAsync("READMIT_VISIT", ["True"], "replace", 0)
                                    .then(refreshData(worksheet)
                                        .then(function(finaldata){
                                            table.clear();
                                            table.rows.add(finaldata);
                                            table.order([3, 'asc']).draw()
                                        }))
                            }
                        },
                        {
                            text: 'Renal Colic Visits',
                            action: function (e, dt, node, config) {
                                alert("Not yet active.");
                            }
                        },
                        {
                            text: 'More buttons to come...',
                            action: function (e, dt, node, config) {
                                alert("Not yet active.");
                            }
                        }]
                });

                function format(d) {
                    // `d` is the original data object for the row
                    // return some details only for patient's that qualify
                    function readmit_cells() {
                        if (d.READMIT_DAYS != 'Null') {
                            return '<td>Readmission Info:</td>' +
                                '<td>'+d.READMIT_DAYS+' days after discharge.</td>' +
                                '</tr>';
                        } else {
                            return '';
                        }
                    }

                    return '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">' +
                        '<tr>' +
                        '<td>Presenting Complaint:</td>' +
                        '<td>' + d.PRESENTING_COMPLAINT + '</td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td>Arrival Mode:</td>' +
                        '<td>' + d.ARRIVAL_MODE + '</td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td>Abstracted ICD10 Diagnosis:</td>' +
                        '<td>' + d.DXCODE1_NV + ' (' + d.DX_DESC + ')</td>' +
                        '</tr>' +
                        readmit_cells() +
                        '</table>';
                };

                // Add event listener for opening and closing details
                $('#datatable tbody').on('click', 'td.details-control', function () {
                    var tr = $(this).closest('tr');
                    var row = table.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    } else {
                        // Open this row
                        row.child(format(row.data())).show();
                        tr.addClass('shown');
                    }
                });
            });

        })
    })
 })()