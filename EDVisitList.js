'use strict';
// This was really helpful: https://github.com/tableaumagic/tableau-datatables-extension/blob/master/public/js/index.js
// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function () {
            const worksheet = tableau.extensions.dashboardContent.dashboard.worksheets.find(w => w.name === "Visit List");

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

                //Add event listener to refresh table when parameters changed
                worksheet.getParametersAsync().then(function (parameters) {
                    parameters.forEach(function (p) {
                        p.addEventListener(tableau.TableauEventType.ParameterChanged, onParameterChange);
                    });
                });

                function onParameterChange (parameterChangeEvent) {
                    refreshData(worksheet).then(function(finaldata){
                        table.clear();
                        table.rows.add(finaldata);
                        table.draw();
                    });
                }

                const table = $('#datatable').DataTable({
                    dom: 'frtip', //shows where to display each element on page
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
                            orderable: false,
                            width: "75px"
                        },
                        {   data: "PATIENT_NAME",
                            width: "150px"
                        },
                        {data: "PHYSICIAN_ASSESSMENT_DT"},
                        {data: "CTAS"},
                        {data: "DISP_GROUP"},
                        {
                            render: function (data, type, row, meta) {
                                var icon_html = '';
                                if (row.READMIT_VISIT == 'True') {
                                    icon_html = icon_html + '<img src="readmit.png" alt="Alert" height="16" width="16">';
                                }
                                if (row.CT_MTBI_ALERT == 'True' || row.CT_PE_ALERT == 'True') {
                                    icon_html = icon_html + '<img src="ct.png" alt="CT" height="16" width="16">';
                                }
                                if (row.PIA_TO_DISCHARGE_ALERT == 'True' || row.PIA_TO_CONSULT_ALERT == 'True') {
                                    icon_html = icon_html + '<img src="timewarning.png" alt="PIA_90P" height="16" width="16">';
                                }
                                return icon_html;
                            }
                        },
                        {data: "DIAGNOSIS_DESCRIPTION"}
                    ],
                    order: [[3, "desc"]],
                    pageLength: 15
                });

                function format(d) {
                    // `d` is the original data object for the row
                    // return some details only for patient's that qualify
                    function alert_cells() {
                        var alert_cells_html = '';
                        if (d.READMIT_VISIT == 'True') {
                            alert_cells_html = alert_cells_html +
                                '<tr>' +
                                '<td><img src="readmit.png" alt="Alert" height="16" width="16"></td>' +
                                '<td>This visit was readmitted ' +d.READMIT_DAYS+' days after discharge.</td>' +
                                '</tr>';
                                }
                        if (d.CT_MTBI_ALERT == 'True') {
                                alert_cells_html = alert_cells_html +
                                '<tr>' +
                                '<td><img src="ct.png" alt="Alert" height="16" width="16"></td>' +
                                '<td>This visit met the MTBI criteria and had a CT ordered.</td>' +
                                '</tr>';
                                }
                        if (d.CT_PE_ALERT == 'True') {
                                alert_cells_html = alert_cells_html +
                                '<tr>' +
                                '<td><img src="ct.png" alt="Alert" height="16" width="16"></td>' +
                                '<td>This visit met the PE criteria and had a CT ordered.</td>' +
                                '</tr>';
                                }
                        if (d.PIA_TO_CONSULT_ALERT == 'True') {
                                alert_cells_html = alert_cells_html +
                                '<tr>' +
                                '<td><img src="timewarning.png" alt="Alert" height="16" width="16"></td>' +
                                '<td>This patient had a PIA to consult time that was greater than the 90th percentile (within the same site and q 6 month period).</td>' +
                                '</tr>';
                                }
                        if (d.PIA_TO_DISCHARGE_ALERT == 'True') {
                                alert_cells_html = alert_cells_html +
                                '<tr>' +
                                '<td><img src="timewarning.png" alt="Alert" height="16" width="16"></td>' +
                                '<td>This patient had a PIA to discharge time that was greater than the 90th percentile (within the same site and q 6 month period).</td>' +
                                '</tr>';
                                }
                        return alert_cells_html;

                    }

                    return '<div class="container-fluid">' +
                    '<div class="row justify-content-start">' +
                        '<div class="col-md-5">' +
                            '<h6>Visit Details</h6>' +
                                '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">' +
                                '<tr>' +
                                '<td>Presenting Complaint:</td>' +
                                '<td>' + d.PRESENTING_COMPLAINT + '</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td>Arrival Mode:</td>' +
                                '<td>' + d.ARRIVAL_MODE + '</td>' +
                                '</tr>' +
                                '<tr>' +
                                '<td>ICD10 Dx:</td>' +
                                '<td>' + d.DXCODE1_NV + ' (' + d.DX_DESC + ')</td>' +
                                '</tr>' +
                                '</table>' +
                        '</div>' +
                        '<div class="col-md-5">' +
                            '<h6>Alerts</h6>' +
                                '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">' +
                                alert_cells() +
                                '</table>' +
                        '</div>' +
                    '</div>'
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